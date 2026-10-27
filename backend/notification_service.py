from datetime import date, datetime
from sqlalchemy.orm import Session
import models


def calculate_doc_status(expiry_date: date):
    """
    Computes days remaining and urgency status for a vehicle document.
    """
    today = date.today()
    days = (expiry_date - today).days

    if days < 0:
        return {
            "days_remaining": days,
            "status": "expired",
            "status_label": f"Expired {abs(days)} day{'s' if abs(days) != 1 else ''} ago"
        }
    elif days == 0:
        return {
            "days_remaining": 0,
            "status": "critical",
            "status_label": "Expires TODAY!"
        }
    elif days <= 7:
        return {
            "days_remaining": days,
            "status": "critical",
            "status_label": f"Expires in {days} day{'s' if days != 1 else ''} (Urgent)"
        }
    elif days <= 30:
        return {
            "days_remaining": days,
            "status": "warning",
            "status_label": f"Expires in {days} days"
        }
    else:
        return {
            "days_remaining": days,
            "status": "active",
            "status_label": f"Valid ({days} days left)"
        }


def format_doc_out(doc: models.Document):
    """Augments document model with dynamic status fields."""
    calc = calculate_doc_status(doc.expiry_date)
    return {
        "id": doc.id,
        "vehicle_id": doc.vehicle_id,
        "doc_type": doc.doc_type,
        "doc_number": doc.doc_number,
        "issuing_authority": doc.issuing_authority,
        "issue_date": doc.issue_date,
        "expiry_date": doc.expiry_date,
        "alert_threshold_days": doc.alert_threshold_days,
        "notes": doc.notes,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
        "days_remaining": calc["days_remaining"],
        "status": calc["status"],
        "status_label": calc["status_label"],
    }


def format_vehicle_out(vehicle: models.Vehicle):
    """Augments vehicle with aggregated status and decorated document list."""
    docs_out = [format_doc_out(d) for d in vehicle.documents]
    expired_cnt = sum(1 for d in docs_out if d["status"] == "expired")
    critical_cnt = sum(1 for d in docs_out if d["status"] == "critical")
    warning_cnt = sum(1 for d in docs_out if d["status"] == "warning")

    if expired_cnt > 0:
        overall = "expired"
    elif critical_cnt > 0:
        overall = "critical"
    elif warning_cnt > 0:
        overall = "warning"
    else:
        overall = "active"

    dl_status = None
    if vehicle.driver_license_expiry:
        dl_status = calculate_doc_status(vehicle.driver_license_expiry)

    # Compute quick document slots (Insurance, PUC, RC, NOC, etc.)
    doc_summary = {}
    for d in docs_out:
        dtype = d["doc_type"]
        key = dtype
        d_lower = dtype.lower()
        if "insurance" in d_lower:
            key = "Insurance"
        elif "puc" in d_lower or "pollution" in d_lower:
            key = "PUC"
        elif "rc" in d_lower or "registration" in d_lower:
            key = "RC"
        elif "noc" in d_lower:
            key = "NOC"
        doc_summary[key] = d

    # Worker info from relationship or driver fields
    w_name = vehicle.worker.name if vehicle.worker else vehicle.driver_name
    w_code = vehicle.worker.worker_code if vehicle.worker else None
    w_phone = vehicle.worker.phone if vehicle.worker else vehicle.driver_phone

    return {
        "id": vehicle.id,
        "vehicle_number": vehicle.vehicle_number,
        "vehicle_type": vehicle.vehicle_type,
        "model_name": vehicle.model_name,
        "owner_name": vehicle.owner_name,
        "owner_email": vehicle.owner_email,
        "owner_phone": vehicle.owner_phone,
        "driver_name": vehicle.driver_name,
        "driver_phone": vehicle.driver_phone,
        "driver_license_no": vehicle.driver_license_no,
        "driver_license_expiry": vehicle.driver_license_expiry,
        "driver_notes": vehicle.driver_notes,
        "driver_license_status": dl_status,
        "assigned_worker_id": vehicle.assigned_worker_id,
        "worker_name": w_name,
        "worker_code": w_code,
        "worker_phone": w_phone,
        "doc_summary": doc_summary,
        "notes": vehicle.notes,
        "created_at": vehicle.created_at,
        "updated_at": vehicle.updated_at,
        "total_documents": len(docs_out),
        "expired_documents_count": expired_cnt,
        "expiring_soon_count": critical_cnt + warning_cnt,
        "overall_status": overall,
        "documents": docs_out,
    }


def format_worker_out(worker: models.Worker):
    calc = calculate_doc_status(worker.license_expiry)
    assigned_v = None
    if worker.vehicles:
        assigned_v = worker.vehicles[0]

    return {
        "id": worker.id,
        "worker_code": worker.worker_code,
        "name": worker.name,
        "blood_group": worker.blood_group,
        "phone": worker.phone,
        "email": worker.email,
        "license_no": worker.license_no,
        "license_type": worker.license_type,
        "license_expiry": worker.license_expiry,
        "joining_date": worker.joining_date,
        "status": worker.status,
        "notes": worker.notes,
        "created_at": worker.created_at,
        "updated_at": worker.updated_at,
        "assigned_vehicle_id": assigned_v.id if assigned_v else None,
        "assigned_vehicle_number": assigned_v.vehicle_number if assigned_v else None,
        "assigned_vehicle_model": assigned_v.model_name if assigned_v else None,
        "license_status": calc,
    }


def dispatch_notification(
    db: Session,
    doc: models.Document,
    channel: str = "Email",
    custom_recipient: str = None
):
    """
    Creates and records a notification alert for a document's expiry.
    Simulates sending via the designated channel (Email, SMS, Browser, In-App).
    """
    calc = calculate_doc_status(doc.expiry_date)
    vehicle = doc.vehicle

    recipient = custom_recipient or vehicle.owner_email or vehicle.owner_phone or "Owner"
    days = calc["days_remaining"]

    if days < 0:
        title = f"⚠️ EXPIRED: {doc.doc_type} for {vehicle.vehicle_number}"
        urgency = "expired"
        message = (
            f"Dear {vehicle.owner_name}, the {doc.doc_type} (Doc #{doc.doc_number or 'N/A'}) "
            f"for your vehicle {vehicle.vehicle_number} ({vehicle.model_name or ''}) "
            f"expired on {doc.expiry_date.strftime('%d-%b-%Y')} ({abs(days)} days ago). "
            f"Please renew immediately to avoid penalties or legal issues."
        )
    elif days <= 7:
        title = f"🚨 URGENT ACTION: {doc.doc_type} expires in {days} day(s) for {vehicle.vehicle_number}"
        urgency = "critical"
        message = (
            f"Dear {vehicle.owner_name}, your vehicle {vehicle.vehicle_number} has its "
            f"{doc.doc_type} expiring on {doc.expiry_date.strftime('%d-%b-%Y')} ({days} days left). "
            f"Please renew promptly."
        )
    else:
        title = f"🔔 Reminder: {doc.doc_type} for {vehicle.vehicle_number} expires soon"
        urgency = "warning"
        message = (
            f"Dear {vehicle.owner_name}, please be advised that the {doc.doc_type} "
            f"for vehicle {vehicle.vehicle_number} is scheduled to expire on "
            f"{doc.expiry_date.strftime('%d-%b-%Y')} ({days} days remaining)."
        )

    log_entry = models.NotificationLog(
        vehicle_id=vehicle.id,
        document_id=doc.id,
        recipient=recipient,
        channel=channel,
        title=title,
        message=message,
        urgency=urgency,
        is_read=False,
        sent_at=datetime.utcnow(),
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    return {
        "status": "success",
        "notification_id": log_entry.id,
        "channel": channel,
        "recipient": recipient,
        "title": title,
        "message": message,
        "urgency": urgency,
        "sent_at": log_entry.sent_at.isoformat(),
    }


def sync_auto_alerts(db: Session):
    """
    Scans documents expiring within threshold or already expired.
    Generates unread in-app alerts if not already generated today.
    """
    today = date.today()
    docs = db.query(models.Document).all()
    created_count = 0

    for doc in docs:
        calc = calculate_doc_status(doc.expiry_date)
        # Check if expired or within threshold days
        if calc["days_remaining"] <= doc.alert_threshold_days:
            # Check if an alert was already logged today for this document
            existing = (
                db.query(models.NotificationLog)
                .filter(
                    models.NotificationLog.document_id == doc.id,
                    models.NotificationLog.channel == "In-App",
                )
                .order_by(models.NotificationLog.sent_at.desc())
                .first()
            )
            # Create if no previous log or last logged more than 24 hours ago
            should_create = False
            if not existing:
                should_create = True
            else:
                elapsed = (datetime.utcnow() - existing.sent_at).total_seconds()
                if elapsed > 86400:  # 24 hours
                    should_create = True

            if should_create:
                dispatch_notification(db, doc, channel="In-App")
                created_count += 1

    return created_count
