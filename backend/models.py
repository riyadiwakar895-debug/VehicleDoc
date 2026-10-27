from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    ForeignKey,
    Boolean,
)
from sqlalchemy.orm import relationship
from database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(50), unique=True, index=True, nullable=False)
    vehicle_type = Column(String(50), default="Car")  # Car, Bike, Truck, Auto, etc.
    model_name = Column(String(100), nullable=True)   # e.g., Hyundai Creta, Honda City
    owner_name = Column(String(100), nullable=False)
    owner_email = Column(String(150), nullable=True)
    owner_phone = Column(String(30), nullable=True)

    # Driver / Worker Details
    driver_name = Column(String(100), nullable=True)
    driver_phone = Column(String(30), nullable=True)
    driver_license_no = Column(String(50), nullable=True)
    driver_license_expiry = Column(Date, nullable=True)
    driver_notes = Column(Text, nullable=True)
    assigned_worker_id = Column(Integer, ForeignKey("workers.id", ondelete="SET NULL"), nullable=True)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    worker = relationship("Worker", back_populates="vehicles")
    documents = relationship("Document", back_populates="vehicle", cascade="all, delete-orphan")
    notifications = relationship("NotificationLog", back_populates="vehicle", cascade="all, delete-orphan")


class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    worker_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., WRK-002
    name = Column(String(100), nullable=False)
    blood_group = Column(String(10), default="O+")
    phone = Column(String(30), nullable=False)
    email = Column(String(150), nullable=True)
    license_no = Column(String(50), nullable=False)
    license_type = Column(String(20), default="LMV")  # LMV, HMV, etc.
    license_expiry = Column(Date, nullable=False, index=True)
    joining_date = Column(Date, nullable=True)
    status = Column(String(30), default="Active")  # Active, Inactive, On Leave
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    vehicles = relationship("Vehicle", back_populates="worker")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    doc_type = Column(String(50), nullable=False)  # Insurance, NOC, PUC, Fitness, Road Tax, RC, Other
    doc_number = Column(String(100), nullable=True)
    issuing_authority = Column(String(150), nullable=True)  # Provider / RTO / Authority
    issue_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=False, index=True)
    alert_threshold_days = Column(Integer, default=30)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    vehicle = relationship("Vehicle", back_populates="documents")
    notifications = relationship("NotificationLog", back_populates="document", cascade="all, delete-orphan")


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    recipient = Column(String(150), nullable=True)
    channel = Column(String(50), default="In-App")  # In-App, Email, SMS, Browser
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    urgency = Column(String(30), default="warning")  # expired, critical, warning, info
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="notifications")
    document = relationship("Document", back_populates="notifications")
