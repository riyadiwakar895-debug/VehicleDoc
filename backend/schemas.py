from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ---------------- Document Schemas ---------------- #
class DocumentBase(BaseModel):
    doc_type: str = Field(..., description="Document type: Insurance, NOC, PUC, Fitness, RC, Road Tax, etc.")
    doc_number: Optional[str] = None
    issuing_authority: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: date
    alert_threshold_days: int = 30
    notes: Optional[str] = None


class DocumentCreate(DocumentBase):
    vehicle_id: Optional[int] = None


class DocumentUpdate(BaseModel):
    doc_type: Optional[str] = None
    doc_number: Optional[str] = None
    issuing_authority: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    alert_threshold_days: Optional[int] = None
    notes: Optional[str] = None


class DocumentOut(DocumentBase):
    id: int
    vehicle_id: int
    created_at: datetime
    updated_at: datetime
    days_remaining: int
    status: str  # "expired", "critical" (<=7d), "warning" (<=30d), "active" (>30d)
    status_label: str

    class Config:
        from_attributes = True


# ---------------- Worker Schemas ---------------- #
class WorkerBase(BaseModel):
    worker_code: str = Field(..., description="Worker ID e.g. WRK-002")
    name: str = Field(..., description="Worker full name")
    blood_group: str = "O+"
    phone: str = Field(..., description="Phone number e.g. +91 98110 22002")
    email: Optional[str] = None
    license_no: str = Field(..., description="Driver license number")
    license_type: str = "LMV"  # LMV, HMV
    license_expiry: date
    joining_date: Optional[date] = None
    status: str = "Active"  # Active, Inactive, On Leave
    notes: Optional[str] = None


class WorkerCreate(WorkerBase):
    assigned_vehicle_id: Optional[int] = None


class WorkerUpdate(BaseModel):
    worker_code: Optional[str] = None
    name: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    license_no: Optional[str] = None
    license_type: Optional[str] = None
    license_expiry: Optional[date] = None
    joining_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_vehicle_id: Optional[int] = None


class WorkerOut(WorkerBase):
    id: int
    created_at: datetime
    updated_at: datetime
    assigned_vehicle_id: Optional[int] = None
    assigned_vehicle_number: Optional[str] = None
    assigned_vehicle_model: Optional[str] = None
    license_status: Optional[dict] = None  # { days_remaining, status, status_label }

    class Config:
        from_attributes = True


class WorkerStats(BaseModel):
    total_workers: int
    active_count: int
    license_expiring_count: int
    on_leave_count: int
    inactive_count: int


# ---------------- Vehicle Schemas ---------------- #
class VehicleBase(BaseModel):
    vehicle_number: str = Field(..., description="Vehicle registration number e.g. MH12AB1234")
    vehicle_type: str = "Car"
    model_name: Optional[str] = None
    owner_name: str
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_license_no: Optional[str] = None
    driver_license_expiry: Optional[date] = None
    driver_notes: Optional[str] = None
    assigned_worker_id: Optional[int] = None
    notes: Optional[str] = None


class VehicleCreate(VehicleBase):
    documents: Optional[List[DocumentBase]] = []


class VehicleUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    model_name: Optional[str] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_license_no: Optional[str] = None
    driver_license_expiry: Optional[date] = None
    driver_notes: Optional[str] = None
    assigned_worker_id: Optional[int] = None
    notes: Optional[str] = None


class VehicleOut(VehicleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    total_documents: int = 0
    expired_documents_count: int = 0
    expiring_soon_count: int = 0  # within 30 days
    overall_status: str = "active"  # "expired", "warning", "active", "critical"
    driver_license_status: Optional[dict] = None
    worker_name: Optional[str] = None
    worker_code: Optional[str] = None
    worker_phone: Optional[str] = None
    doc_summary: Optional[dict] = None  # { Insurance: {...}, PUC: {...}, RC: {...}, NOC: {...} }
    documents: List[DocumentOut] = []

    class Config:
        from_attributes = True


# ---------------- Notification Schemas ---------------- #
class NotificationLogOut(BaseModel):
    id: int
    vehicle_id: int
    document_id: Optional[int] = None
    recipient: Optional[str] = None
    channel: str
    title: str
    message: str
    urgency: str
    is_read: bool
    sent_at: datetime
    vehicle_number: Optional[str] = None
    doc_type: Optional[str] = None

    class Config:
        from_attributes = True


class SendNotificationRequest(BaseModel):
    document_id: int
    channel: str = "Email"  # "Email", "SMS", "In-App", "Browser"
    custom_recipient: Optional[str] = None


class StatsSummary(BaseModel):
    total_vehicles: int
    total_documents: int
    expired_count: int
    critical_count: int  # <= 7 days
    warning_count: int   # <= 30 days
    active_count: int
