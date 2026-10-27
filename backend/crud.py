from datetime import date, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

import models
import schemas
from notification_service import calculate_doc_status, format_vehicle_out, format_doc_out, format_worker_out


# ---------------- Vehicle CRUD ---------------- #
def get_vehicles(
    db: Session,
    search: Optional[str] = None,
    status_filter: Optional[str] = None
) -> List[dict]:
    query = db.query(models.Vehicle)

    if search:
        search_pattern = f"%{search.strip().upper()}%"
        query = query.filter(
            or_(
                models.Vehicle.vehicle_number.ilike(search_pattern),
                models.Vehicle.owner_name.ilike(search_pattern),
                models.Vehicle.model_name.ilike(search_pattern),
                models.Vehicle.driver_name.ilike(search_pattern),
                models.Vehicle.driver_license_no.ilike(search_pattern),
            )
        )

    vehicles = query.order_by(models.Vehicle.created_at.desc()).all()
    formatted = [format_vehicle_out(v) for v in vehicles]

    if status_filter and status_filter != "all":
        if status_filter == "expiring_soon":
            # Show vehicles with either critical or warning documents
            formatted = [v for v in formatted if v["expiring_soon_count"] > 0]
        elif status_filter == "expired":
            formatted = [v for v in formatted if v["expired_documents_count"] > 0]
        elif status_filter == "active":
            formatted = [v for v in formatted if v["overall_status"] == "active"]

    return formatted


def get_vehicle(db: Session, vehicle_id: int):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        return None
    return format_vehicle_out(vehicle)


def get_vehicle_by_number(db: Session, vehicle_number: str):
    clean_no = vehicle_number.strip().upper()
    return db.query(models.Vehicle).filter(models.Vehicle.vehicle_number == clean_no).first()


def create_vehicle(db: Session, vehicle_in: schemas.VehicleCreate):
    clean_no = vehicle_in.vehicle_number.strip().upper()
    db_vehicle = models.Vehicle(
        vehicle_number=clean_no,
        vehicle_type=vehicle_in.vehicle_type,
        model_name=vehicle_in.model_name,
        owner_name=vehicle_in.owner_name.strip(),
        owner_email=vehicle_in.owner_email.strip() if vehicle_in.owner_email else None,
        owner_phone=vehicle_in.owner_phone.strip() if vehicle_in.owner_phone else None,
        driver_name=vehicle_in.driver_name.strip() if vehicle_in.driver_name else None,
        driver_phone=vehicle_in.driver_phone.strip() if vehicle_in.driver_phone else None,
        driver_license_no=vehicle_in.driver_license_no.strip().upper() if vehicle_in.driver_license_no else None,
        driver_license_expiry=vehicle_in.driver_license_expiry,
        driver_notes=vehicle_in.driver_notes,
        notes=vehicle_in.notes,
    )
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)

    # If driver license expiry is provided and no DL doc exists in documents list, create tracked document
    existing_dl_in_docs = any(d.doc_type.lower() in ["driving license", "driver license", "dl"] for d in (vehicle_in.documents or []))
    if vehicle_in.driver_license_expiry and not existing_dl_in_docs:
        dl_doc = models.Document(
            vehicle_id=db_vehicle.id,
            doc_type="Driving License",
            doc_number=vehicle_in.driver_license_no or "N/A",
            issuing_authority=f"Driver: {vehicle_in.driver_name or 'Assigned Driver'}",
            issue_date=None,
            expiry_date=vehicle_in.driver_license_expiry,
            alert_threshold_days=30,
            notes=f"Driver License for {vehicle_in.driver_name or 'Driver'}",
        )
        db.add(dl_doc)

    # Attach any initial documents provided
    if vehicle_in.documents:
        for doc in vehicle_in.documents:
            db_doc = models.Document(
                vehicle_id=db_vehicle.id,
                doc_type=doc.doc_type,
                doc_number=doc.doc_number,
                issuing_authority=doc.issuing_authority,
                issue_date=doc.issue_date,
                expiry_date=doc.expiry_date,
                alert_threshold_days=doc.alert_threshold_days or 30,
                notes=doc.notes,
            )
            db.add(db_doc)
        db.commit()
        db.refresh(db_vehicle)

    return format_vehicle_out(db_vehicle)


def update_vehicle(db: Session, vehicle_id: int, vehicle_in: schemas.VehicleUpdate):
    db_vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not db_vehicle:
        return None

    update_data = vehicle_in.model_dump(exclude_unset=True)
    if "vehicle_number" in update_data and update_data["vehicle_number"]:
        update_data["vehicle_number"] = update_data["vehicle_number"].strip().upper()

    for field, value in update_data.items():
        setattr(db_vehicle, field, value)

    db.commit()
    db.refresh(db_vehicle)
    return format_vehicle_out(db_vehicle)


def delete_vehicle(db: Session, vehicle_id: int) -> bool:
    db_vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not db_vehicle:
        return False
    db.delete(db_vehicle)
    db.commit()
    return True


# ---------------- Document CRUD ---------------- #
def get_document(db: Session, doc_id: int):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        return None
    return doc


def create_document(db: Session, vehicle_id: int, doc_in: schemas.DocumentCreate):
    db_doc = models.Document(
        vehicle_id=vehicle_id,
        doc_type=doc_in.doc_type,
        doc_number=doc_in.doc_number,
        issuing_authority=doc_in.issuing_authority,
        issue_date=doc_in.issue_date,
        expiry_date=doc_in.expiry_date,
        alert_threshold_days=doc_in.alert_threshold_days or 30,
        notes=doc_in.notes,
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return format_doc_out(db_doc)


def update_document(db: Session, doc_id: int, doc_in: schemas.DocumentUpdate):
    db_doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not db_doc:
        return None

    update_data = doc_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_doc, field, value)

    db.commit()
    db.refresh(db_doc)
    return format_doc_out(db_doc)


def renew_document(db: Session, doc_id: int, new_expiry_date: date, new_doc_number: Optional[str] = None):
    db_doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not db_doc:
        return None

    db_doc.expiry_date = new_expiry_date
    db_doc.issue_date = date.today()
    if new_doc_number:
        db_doc.doc_number = new_doc_number

    db.commit()
    db.refresh(db_doc)
    return format_doc_out(db_doc)


def delete_document(db: Session, doc_id: int) -> bool:
    db_doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not db_doc:
        return False
    db.delete(db_doc)
    db.commit()
    return True


# ---------------- Expiring Documents & Stats ---------------- #
def get_expiring_documents(db: Session, days_window: int = 30):
    docs = db.query(models.Document).join(models.Vehicle).all()
    results = []
    for doc in docs:
        calc = calculate_doc_status(doc.expiry_date)
        if calc["days_remaining"] <= days_window:
            d_out = format_doc_out(doc)
            d_out["vehicle_number"] = doc.vehicle.vehicle_number
            d_out["vehicle_model"] = doc.vehicle.model_name
            d_out["owner_name"] = doc.vehicle.owner_name
            d_out["owner_email"] = doc.vehicle.owner_email
            d_out["owner_phone"] = doc.vehicle.owner_phone
            results.append(d_out)

    results.sort(key=lambda x: x["days_remaining"])
    return results


def get_stats_summary(db: Session):
    total_vehicles = db.query(models.Vehicle).count()
    docs = db.query(models.Document).all()
    total_documents = len(docs)

    expired_count = 0
    critical_count = 0
    warning_count = 0
    active_count = 0

    for doc in docs:
        calc = calculate_doc_status(doc.expiry_date)
        status = calc["status"]
        if status == "expired":
            expired_count += 1
        elif status == "critical":
            critical_count += 1
        elif status == "warning":
            warning_count += 1
        else:
            active_count += 1

    return {
        "total_vehicles": total_vehicles,
        "total_documents": total_documents,
        "expired_count": expired_count,
        "critical_count": critical_count,
        "warning_count": warning_count,
        "active_count": active_count,
    }


# ---------------- Notification Log CRUD ---------------- #
def get_notification_logs(db: Session, limit: int = 50, unread_only: bool = False):
    query = db.query(models.NotificationLog).join(models.Vehicle, isouter=True).join(models.Document, isouter=True)
    if unread_only:
        query = query.filter(models.NotificationLog.is_read == False)

    logs = query.order_by(models.NotificationLog.sent_at.desc()).limit(limit).all()
    results = []
    for log in logs:
        results.append({
            "id": log.id,
            "vehicle_id": log.vehicle_id,
            "document_id": log.document_id,
            "recipient": log.recipient,
            "channel": log.channel,
            "title": log.title,
            "message": log.message,
            "urgency": log.urgency,
            "is_read": log.is_read,
            "sent_at": log.sent_at,
            "vehicle_number": log.vehicle.vehicle_number if log.vehicle else "N/A",
            "doc_type": log.document.doc_type if log.document else "N/A",
        })
    return results


def mark_notification_read(db: Session, notification_id: int):
    log = db.query(models.NotificationLog).filter(models.NotificationLog.id == notification_id).first()
    if log:
        log.is_read = True
        db.commit()
        return True
    return False


def mark_all_notifications_read(db: Session):
    db.query(models.NotificationLog).filter(models.NotificationLog.is_read == False).update({"is_read": True})
    db.commit()
    return True


# ---------------- Worker CRUD ---------------- #
def get_workers(
    db: Session,
    search: Optional[str] = None,
    status_filter: Optional[str] = None
) -> List[dict]:
    query = db.query(models.Worker)
    if search:
        p = f"%{search.strip().upper()}%"
        query = query.filter(
            or_(
                models.Worker.name.ilike(p),
                models.Worker.worker_code.ilike(p),
                models.Worker.license_no.ilike(p),
                models.Worker.phone.ilike(p),
            )
        )
    workers = query.order_by(models.Worker.worker_code.asc()).all()
    formatted = [format_worker_out(w) for w in workers]

    if status_filter and status_filter.lower() != "all":
        s = status_filter.lower()
        if s == "active":
            formatted = [w for w in formatted if w["status"].lower() == "active"]
        elif s == "inactive":
            formatted = [w for w in formatted if w["status"].lower() == "inactive"]
        elif s == "on_leave" or s == "on leave":
            formatted = [w for w in formatted if "leave" in w["status"].lower()]
        elif s in ["license_alert", "license alert", "alert"]:
            formatted = [w for w in formatted if w["license_status"]["status"] in ["critical", "warning", "expired"]]

    return formatted


def get_worker(db: Session, worker_id: int):
    worker = db.query(models.Worker).filter(models.Worker.id == worker_id).first()
    if not worker:
        return None
    return format_worker_out(worker)


def create_worker(db: Session, worker_in: schemas.WorkerCreate):
    w = models.Worker(
        worker_code=worker_in.worker_code.strip().upper(),
        name=worker_in.name.strip(),
        blood_group=worker_in.blood_group,
        phone=worker_in.phone.strip(),
        email=worker_in.email.strip() if worker_in.email else None,
        license_no=worker_in.license_no.strip().upper(),
        license_type=worker_in.license_type,
        license_expiry=worker_in.license_expiry,
        joining_date=worker_in.joining_date or date.today(),
        status=worker_in.status or "Active",
        notes=worker_in.notes,
    )
    db.add(w)
    db.commit()
    db.refresh(w)

    if worker_in.assigned_vehicle_id:
        v = db.query(models.Vehicle).filter(models.Vehicle.id == worker_in.assigned_vehicle_id).first()
        if v:
            v.assigned_worker_id = w.id
            db.commit()

    return format_worker_out(w)


def update_worker(db: Session, worker_id: int, worker_in: schemas.WorkerUpdate):
    w = db.query(models.Worker).filter(models.Worker.id == worker_id).first()
    if not w:
        return None

    update_data = worker_in.model_dump(exclude_unset=True)
    assigned_v_id = update_data.pop("assigned_vehicle_id", None)

    for field, val in update_data.items():
        setattr(w, field, val)

    if assigned_v_id is not None:
        for v in w.vehicles:
            v.assigned_worker_id = None
        if assigned_v_id > 0:
            target_v = db.query(models.Vehicle).filter(models.Vehicle.id == assigned_v_id).first()
            if target_v:
                target_v.assigned_worker_id = w.id

    db.commit()
    db.refresh(w)
    return format_worker_out(w)


def delete_worker(db: Session, worker_id: int) -> bool:
    w = db.query(models.Worker).filter(models.Worker.id == worker_id).first()
    if not w:
        return False
    for v in w.vehicles:
        v.assigned_worker_id = None
    db.delete(w)
    db.commit()
    return True


def get_worker_stats(db: Session):
    workers = db.query(models.Worker).all()
    total = len(workers)
    active = sum(1 for w in workers if w.status.lower() == "active")
    on_leave = sum(1 for w in workers if "leave" in w.status.lower())
    inactive = sum(1 for w in workers if w.status.lower() == "inactive")

    license_expiring = 0
    today = date.today()
    for w in workers:
        if (w.license_expiry - today).days <= 30:
            license_expiring += 1

    return {
        "total_workers": total,
        "active_count": active,
        "license_expiring_count": license_expiring,
        "on_leave_count": on_leave,
        "inactive_count": inactive,
    }
