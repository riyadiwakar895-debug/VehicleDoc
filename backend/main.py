import os
from contextlib import asynccontextmanager
from typing import Optional, List
from datetime import date

from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models
import schemas
import crud
import notification_service
from seed_data import seed_sample_data

# Ensure schema migrations for new columns
def ensure_schema_migrations():
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            columns = [row[1] for row in conn.execute(text("PRAGMA table_info(vehicles)")).fetchall()]
            new_cols = [
                ("driver_name", "VARCHAR(100)"),
                ("driver_phone", "VARCHAR(30)"),
                ("driver_license_no", "VARCHAR(50)"),
                ("driver_license_expiry", "DATE"),
                ("driver_notes", "TEXT"),
                ("assigned_worker_id", "INTEGER"),
            ]
            for col_name, col_type in new_cols:
                if col_name not in columns:
                    conn.execute(text(f"ALTER TABLE vehicles ADD COLUMN {col_name} {col_type}"))
            conn.commit()
        except Exception as e:
            print("Migration note:", e)

ensure_schema_migrations()
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed database and run initial alert sync
    db = next(get_db())
    try:
        seed_sample_data(db)
        notification_service.sync_auto_alerts(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Vehicle Document Expiry & Notification Tracker API",
    description="FastAPI + SQL Backend for tracking Vehicle Details, Insurance, NOC, PUC, and Expiry Alerts",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for external frontend or local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Dashboard & Stats API ----------------- #
@app.get("/api/stats", response_model=schemas.StatsSummary, tags=["Dashboard"])
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Returns overview statistics: total vehicles, total documents, expired, critical, warning counts."""
    return crud.get_stats_summary(db)


# ----------------- Vehicle Management API ----------------- #
@app.get("/api/vehicles", response_model=List[schemas.VehicleOut], tags=["Vehicles"])
def list_vehicles(
    search: Optional[str] = Query(None, description="Search vehicle number, owner name, or model"),
    status: Optional[str] = Query(None, description="Filter: all, expiring_soon, expired, active"),
    db: Session = Depends(get_db)
):
    """Lists all vehicles with computed document urgency status and days remaining."""
    return crud.get_vehicles(db, search=search, status_filter=status)


@app.post("/api/vehicles", response_model=schemas.VehicleOut, status_code=status.HTTP_201_CREATED, tags=["Vehicles"])
def create_vehicle(vehicle_in: schemas.VehicleCreate, db: Session = Depends(get_db)):
    """Registers a new vehicle along with any initial documents (Insurance, NOC, etc.)."""
    existing = crud.get_vehicle_by_number(db, vehicle_in.vehicle_number)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with registration number '{vehicle_in.vehicle_number.upper()}' already exists."
        )
    created = crud.create_vehicle(db, vehicle_in)
    # Sync alerts for any newly added documents
    notification_service.sync_auto_alerts(db)
    return created


@app.get("/api/vehicles/{vehicle_id}", response_model=schemas.VehicleOut, tags=["Vehicles"])
def get_vehicle_details(vehicle_id: int, db: Session = Depends(get_db)):
    """Retrieves full details of a specific vehicle including all documents."""
    vehicle = crud.get_vehicle(db, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@app.put("/api/vehicles/{vehicle_id}", response_model=schemas.VehicleOut, tags=["Vehicles"])
def update_vehicle(vehicle_id: int, vehicle_in: schemas.VehicleUpdate, db: Session = Depends(get_db)):
    """Updates vehicle metadata (owner, phone, email, notes)."""
    updated = crud.update_vehicle(db, vehicle_id, vehicle_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return updated


@app.delete("/api/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Vehicles"])
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    """Deletes a vehicle and all its associated documents and logs."""
    success = crud.delete_vehicle(db, vehicle_id)
    if not success:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return None


# ----------------- Document Management API ----------------- #
@app.post("/api/vehicles/{vehicle_id}/documents", response_model=schemas.DocumentOut, status_code=status.HTTP_201_CREATED, tags=["Documents"])
def add_document_to_vehicle(vehicle_id: int, doc_in: schemas.DocumentCreate, db: Session = Depends(get_db)):
    """Adds a new document (Insurance, NOC, PUC, etc.) to a specific vehicle."""
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    new_doc = crud.create_document(db, vehicle_id, doc_in)
    notification_service.sync_auto_alerts(db)
    return new_doc


@app.put("/api/documents/{doc_id}", response_model=schemas.DocumentOut, tags=["Documents"])
def update_document(doc_id: int, doc_in: schemas.DocumentUpdate, db: Session = Depends(get_db)):
    """Modifies document details such as policy number or expiry date."""
    updated = crud.update_document(db, doc_id, doc_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Document not found")
    notification_service.sync_auto_alerts(db)
    return updated


@app.post("/api/documents/{doc_id}/renew", response_model=schemas.DocumentOut, tags=["Documents"])
def renew_document(
    doc_id: int,
    new_expiry_date: date = Query(..., description="The renewed expiry date"),
    new_doc_number: Optional[str] = Query(None, description="Optional updated policy/certificate number"),
    db: Session = Depends(get_db)
):
    """Quick renewal action to update document expiry date and reset validity."""
    renewed = crud.renew_document(db, doc_id, new_expiry_date, new_doc_number)
    if not renewed:
        raise HTTPException(status_code=404, detail="Document not found")
    return renewed


@app.delete("/api/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Documents"])
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    """Removes a document from the system."""
    success = crud.delete_document(db, doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return None


@app.get("/api/expiring-documents", tags=["Expiry Tracker"])
def get_expiring_documents(
    days: int = Query(30, description="Window of days to check for upcoming expiries"),
    db: Session = Depends(get_db)
):
    """Lists all vehicle documents expiring within the specified days window (default 30 days) or already expired."""
    return crud.get_expiring_documents(db, days_window=days)


# ----------------- Notifications & Alerts API ----------------- #
@app.get("/api/notifications", response_model=List[schemas.NotificationLogOut], tags=["Notifications"])
def list_notifications(
    limit: int = Query(50, ge=1, le=200),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Fetches alert notification history, sorted by most recent."""
    return crud.get_notification_logs(db, limit=limit, unread_only=unread_only)


@app.post("/api/notifications/send-alert", tags=["Notifications"])
def send_notification_alert(req: schemas.SendNotificationRequest, db: Session = Depends(get_db)):
    """
    Triggers an immediate expiry alert notification via Email, SMS, or Browser for a specific document.
    Saves the notification log in SQL DB.
    """
    doc = crud.get_document(db, req.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    result = notification_service.dispatch_notification(
        db,
        doc=doc,
        channel=req.channel,
        custom_recipient=req.custom_recipient
    )
    return result


@app.post("/api/notifications/mark-read/{notification_id}", tags=["Notifications"])
def mark_notification_as_read(notification_id: int, db: Session = Depends(get_db)):
    """Marks a single alert notification as read."""
    success = crud.mark_notification_read(db, notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success", "message": "Notification marked as read"}


@app.post("/api/notifications/mark-all-read", tags=["Notifications"])
def mark_all_notifications_as_read(db: Session = Depends(get_db)):
    """Marks all pending in-app notifications as read."""
    crud.mark_all_notifications_read(db)
    return {"status": "success", "message": "All notifications marked as read"}


@app.post("/api/notifications/sync", tags=["Notifications"])
def trigger_alert_sync(db: Session = Depends(get_db)):
    """Triggers an automatic background check across all vehicles to generate expiry alerts."""
    created = notification_service.sync_auto_alerts(db)
    return {"status": "success", "alerts_created": created}


# ----------------- Worker Management API ----------------- #
@app.get("/api/workers/stats", response_model=schemas.WorkerStats, tags=["Workers"])
def get_workers_stats(db: Session = Depends(get_db)):
    """Returns worker statistics (total, active, license expiring, on leave, inactive)."""
    return crud.get_worker_stats(db)


@app.get("/api/workers", response_model=List[schemas.WorkerOut], tags=["Workers"])
def list_workers(
    search: Optional[str] = Query(None, description="Search worker name, code, phone, or license"),
    status: Optional[str] = Query(None, description="Filter: all, active, inactive, on_leave, license_alert"),
    db: Session = Depends(get_db)
):
    """Lists all registered workers with assigned vehicle and license status."""
    return crud.get_workers(db, search=search, status_filter=status)


@app.post("/api/workers", response_model=schemas.WorkerOut, status_code=status.HTTP_201_CREATED, tags=["Workers"])
def create_worker(worker_in: schemas.WorkerCreate, db: Session = Depends(get_db)):
    """Registers a new worker / driver."""
    existing = db.query(models.Worker).filter(models.Worker.worker_code == worker_in.worker_code.strip().upper()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Worker with ID '{worker_in.worker_code.upper()}' already exists."
        )
    return crud.create_worker(db, worker_in)


@app.get("/api/workers/{worker_id}", response_model=schemas.WorkerOut, tags=["Workers"])
def get_worker(worker_id: int, db: Session = Depends(get_db)):
    """Fetches details for a specific worker."""
    worker = crud.get_worker(db, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return worker


@app.put("/api/workers/{worker_id}", response_model=schemas.WorkerOut, tags=["Workers"])
def update_worker(worker_id: int, worker_in: schemas.WorkerUpdate, db: Session = Depends(get_db)):
    """Updates worker details or vehicle assignment."""
    updated = crud.update_worker(db, worker_id, worker_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Worker not found")
    return updated


@app.delete("/api/workers/{worker_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Workers"])
def delete_worker(worker_id: int, db: Session = Depends(get_db)):
    """Removes a worker from the system."""
    success = crud.delete_worker(db, worker_id)
    if not success:
        raise HTTPException(status_code=404, detail="Worker not found")
    return None


# ----------------- Data Export & Seed Reset API ----------------- #
@app.post("/api/seed/reset", tags=["System"])
def reset_and_seed_database(db: Session = Depends(get_db)):
    """Resets and re-seeds database with exact fleet demo data matching VehicleDoc."""
    seed_sample_data(db, force=True)
    notification_service.sync_auto_alerts(db)
    return {"status": "success", "message": "Database reset and re-seeded with VehicleDoc fleet data!"}


# ----------------- Serve Static Frontend (React SPA) ----------------- #
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    @app.get("/", include_in_schema=False)
    def serve_frontend_root():
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    @app.get("/{catchall:path}", include_in_schema=False)
    def serve_frontend_spa(catchall: str):
        # Fallback to index.html for client-side routing if file doesn't exist
        file_path = os.path.join(STATIC_DIR, catchall)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
