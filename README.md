# 🚗 VehicleDoc - Fleet Document & Expiry Management

A modern, high-performance web application designed for fleet managers, transport businesses, and vehicle owners to track **Vehicles, Workers/Drivers, Insurance, PUC, RC, NOC, and Expiry Reminders**.

Built with **FastAPI** (Python backend), **SQL** (SQLAlchemy + SQLite database), and **React** (Tailwind CSS, Lucide Icons, and Clean Enterprise SaaS design).

---

## ✨ Features & Views (Matched to Reference UI)

### 1. 📊 Expiry Dashboard
- **KPI Metrics**: Total Vehicles, Critical (≤7 Days), Expiring (≤30 Days), Expired Documents, and Compliant Vehicles.
- **Document Expiry Forecast**: Visual forecast timeline across 7 days, 30 days, 90 days, and long-term compliance.
- **Urgent Renewals List**: Fast overview with 1-click renewal action.

### 2. 🚛 Vehicle Management
- **Full Fleet Table**:
  - `REG. NUMBER`: e.g. `MH 12 AB 4521`, `DL 01 CA 7890`, `KA 05 MN 3344`, etc.
  - `OWNER`: Full owner details and contacts.
  - `MAKE / MODEL`: Model name and year.
  - `TYPE`: `Mini Truck`, `SUV`, `Light Truck`, `Van`, `Truck`, `Auto / 3-Wheeler`.
  - `INSURANCE`: Status badge with expiration date (e.g. `Critical 06/09/2026`, `Valid 20/11/2026`).
  - `PUC`: Emission certificate status and date.
  - `RC`: Registration Certificate validity and date.
  - `NOC`: No Objection Certificate status (`Valid` or `Pending`).
  - `WORKER`: Assigned driver / worker name.
  - `STATUS`: Overall vehicle compliance (`Valid`, `Critical`, `Warning`, `Expired`).
  - `DOCS`: Clickable document count button (e.g. `📄 5`) that opens the document inspector with renewal capabilities.
- **Filters & Search**: Fast search by reg number, owner, or make; filter pills for `All`, `Critical`, `Warning`, `Expired`, `Valid`.
- **Export**: One-click CSV export.

### 3. 👷 Worker Management
- **Worker KPI Cards**: Total Workers (`9`), Active (`7`), License Expiring (`3`), On Leave (`1`).
- **Worker Data Table**:
  - `WORKER ID`: e.g. `WRK-002`, `WRK-005`.
  - `NAME`: Name with initials avatar circle and blood group badge (e.g. `Deepak Sharma O+`).
  - `PHONE`: Worker phone number.
  - `LICENSE NO.`: Driving License number (e.g. `DL0120180054321`).
  - `LICENSE TYPE`: `LMV`, `HMV`, `MCWG`.
  - `LICENSE EXPIRY`: Status pill (`Valid`, `Expiring`, `Critical`, `Expired`) with date.
  - `ASSIGNED VEHICLE`: Vehicle number and model.
  - `JOINING DATE`: Employee start date.
  - `STATUS`: `Active`, `On Leave`, `Inactive`.
- **Filters**: `All (9)`, `Active (7)`, `Inactive (1)`, `On Leave (1)`, `License Alert (3)`.
- **Export**: One-click Worker CSV export.

### 4. 🔔 Reminders & Alerts
- Real-time multi-channel notification history (Email, SMS, In-App).
- Direct alert dispatcher with live message preview.
- 1-click background scan across all fleet documents.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend** | React 18 + Tailwind CSS + Lucide Icons | Clean white enterprise SaaS interface matching reference screenshots |
| **Backend** | FastAPI (Python 3.14) | Fast asynchronous REST API with auto Swagger UI |
| **Database** | SQL (SQLAlchemy + SQLite) | Relational tables for `vehicles`, `workers`, `documents`, and `notification_logs` |

---

## 🚀 How to Run the Application

### 1. Launch with One Click
Double-click [`run.bat`](file:///C:/Users/Riya/.gemini/antigravity/scratch/vehicle-expiry-tracker/run.bat) located in:
```
C:\Users\Riya\.gemini\antigravity\scratch\vehicle-expiry-tracker\run.bat
```
*(This automatically boots the FastAPI server and launches your browser to the web app).*

### 2. Manual Terminal Launch
```powershell
cd C:\Users\Riya\.gemini\antigravity\scratch\vehicle-expiry-tracker\backend
& "C:\Users\Riya\AppData\Local\Programs\Python\Python314\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

- **Web Application**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Swagger API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
