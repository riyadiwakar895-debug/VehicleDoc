from datetime import date, timedelta
from sqlalchemy.orm import Session
import models


def seed_sample_data(db: Session, force: bool = False):
    """Populates realistic fleet vehicles, workers, and documents matching VehicleDoc app."""
    if not force and db.query(models.Worker).first():
        return

    # Clear existing if force
    if force:
        db.query(models.NotificationLog).delete()
        db.query(models.Document).delete()
        db.query(models.Vehicle).delete()
        db.query(models.Worker).delete()
        db.commit()

    today = date.today()

    # 1. Create Workers
    w1 = models.Worker(
        worker_code="WRK-001",
        name="Santosh Yadav",
        blood_group="B+",
        phone="+91 98220 11001",
        email="santosh.yadav@example.com",
        license_no="MH1220160088991",
        license_type="HMV",
        license_expiry=date(2028, 5, 15),
        joining_date=date(2023, 1, 12),
        status="Active",
        notes="Senior heavy vehicle driver.",
    )
    w2 = models.Worker(
        worker_code="WRK-002",
        name="Deepak Sharma",
        blood_group="O+",
        phone="+91 98110 22002",
        email="deepak.sharma@example.com",
        license_no="DL0120180054321",
        license_type="LMV",
        license_expiry=date(2028, 3, 19),
        joining_date=date(2024, 3, 20),
        status="Active",
        notes="City routes and delivery.",
    )
    w3 = models.Worker(
        worker_code="WRK-003",
        name="Ravi Nair",
        blood_group="B-",
        phone="+91 97440 33003",
        email="ravi.nair@example.com",
        license_no="KA0520210034567",
        license_type="LMV",
        license_expiry=today + timedelta(days=6),  # Critical
        joining_date=date(2024, 4, 14),
        status="Active",
        notes="Light commercial permit.",
    )
    w4 = models.Worker(
        worker_code="WRK-004",
        name="Prakash Bhosale",
        blood_group="AB+",
        phone="+91 90110 44004",
        email="prakash.bhosale@example.com",
        license_no="MH1420190023456",
        license_type="HMV",
        license_expiry=date(2029, 7, 1),
        joining_date=date(2024, 7, 2),
        status="Active",
        notes="Long-haul interstate permit.",
    )
    w5 = models.Worker(
        worker_code="WRK-005",
        name="Karthik Raja",
        blood_group="O-",
        phone="+91 99440 55005",
        email="karthik.raja@example.com",
        license_no="TN0920170078901",
        license_type="LMV",
        license_expiry=today + timedelta(days=22),  # Expiring soon
        joining_date=date(2024, 9, 5),
        status="Active",
        notes="Tamil Nadu state permit.",
    )
    w6 = models.Worker(
        worker_code="WRK-006",
        name="Rohit Verma",
        blood_group="O+",
        phone="+91 94150 66006",
        email="rohit.verma@example.com",
        license_no="UP3220190056789",
        license_type="HMV",
        license_expiry=date(2029, 11, 10),
        joining_date=date(2024, 6, 18),
        status="Active",
        notes="Staff transport specialist.",
    )
    w7 = models.Worker(
        worker_code="WRK-007",
        name="Nilesh Solanki",
        blood_group="A-",
        phone="+91 98250 77007",
        email="nilesh.solanki@example.com",
        license_no="GJ0120200090123",
        license_type="LMV",
        license_expiry=date(2030, 10, 19),
        joining_date=date(2024, 10, 20),
        status="Active",
        notes="Mini truck operations.",
    )
    w8 = models.Worker(
        worker_code="WRK-008",
        name="Mukesh Jain",
        blood_group="O+",
        phone="+91 96600 88008",
        email="mukesh.jain@example.com",
        license_no="RJ1420180012345",
        license_type="LMV",
        license_expiry=date(2028, 11, 27),
        joining_date=date(2024, 11, 28),
        status="Active",
        notes="Local market dispatch.",
    )
    w9 = models.Worker(
        worker_code="WRK-009",
        name="Amit Kumar",
        blood_group="A+",
        phone="+91 98100 99009",
        email="amit.kumar@example.com",
        license_no="DL0420150011223",
        license_type="LMV",
        license_expiry=today - timedelta(days=12),  # Expired
        joining_date=date(2023, 2, 10),
        status="On Leave",
        notes="Medical leave.",
    )
    db.add_all([w1, w2, w3, w4, w5, w6, w7, w8, w9])
    db.commit()

    # 2. Create Vehicles
    v1 = models.Vehicle(
        vehicle_number="MH 12 AB 4521",
        vehicle_type="Mini Truck",
        model_name="Tata Ace (2022)",
        owner_name="Ramesh Patil",
        owner_email="ramesh.patil@example.com",
        owner_phone="+91 98231 12345",
        assigned_worker_id=w1.id,
        driver_name="Santosh Yadav",
        driver_phone="+91 98220 11001",
        notes="City logistics van.",
    )
    v2 = models.Vehicle(
        vehicle_number="DL 01 CA 7890",
        vehicle_type="SUV",
        model_name="Mahindra Bolero (2021)",
        owner_name="Suresh Kumar",
        owner_email="suresh.kumar@example.com",
        owner_phone="+91 98112 34567",
        assigned_worker_id=w2.id,
        driver_name="Deepak Sharma",
        driver_phone="+91 98110 22002",
        notes="Field inspection vehicle.",
    )
    v3 = models.Vehicle(
        vehicle_number="KA 05 MN 3344",
        vehicle_type="Light Truck",
        model_name="Ashok Leyland DOST (2020)",
        owner_name="Manjunath Reddy",
        owner_email="manjunath@example.com",
        owner_phone="+91 98451 98765",
        assigned_worker_id=w3.id,
        driver_name="Ravi Nair",
        driver_phone="+91 97440 33003",
        notes="Regional delivery truck.",
    )
    v4 = models.Vehicle(
        vehicle_number="GJ 01 KL 5577",
        vehicle_type="Mini Truck",
        model_name="Maruti Suzuki Carry (2023)",
        owner_name="Haresh Patel",
        owner_email="haresh.patel@example.com",
        owner_phone="+91 98251 55667",
        assigned_worker_id=w7.id,
        driver_name="Nilesh Solanki",
        driver_phone="+91 98250 77007",
        notes="Factory shuttle.",
    )
    v5 = models.Vehicle(
        vehicle_number="MH 14 PQ 6612",
        vehicle_type="Truck",
        model_name="Eicher Pro 1049 (2023)",
        owner_name="Vijay Shinde",
        owner_email="vijay.shinde@example.com",
        owner_phone="+91 98221 44556",
        assigned_worker_id=w4.id,
        driver_name="Prakash Bhosale",
        driver_phone="+91 90110 44004",
        notes="Heavy load logistics.",
    )
    v6 = models.Vehicle(
        vehicle_number="UP 32 GH 8845",
        vehicle_type="Van",
        model_name="Force Traveller (2022)",
        owner_name="Arun Mishra",
        owner_email="arun.mishra@example.com",
        owner_phone="+91 94151 77889",
        assigned_worker_id=w6.id,
        driver_name="Rohit Verma",
        driver_phone="+91 94150 66006",
        notes="Passenger and crew van.",
    )
    v7 = models.Vehicle(
        vehicle_number="TN 09 RT 2211",
        vehicle_type="Light Truck",
        model_name="Tata 407 (2019)",
        owner_name="K. Ramanathan",
        owner_email="ramanathan@example.com",
        owner_phone="+91 99441 33221",
        assigned_worker_id=w5.id,
        driver_name="Karthik Raja",
        driver_phone="+91 99440 55005",
        notes="Depot transfer vehicle.",
    )
    v8 = models.Vehicle(
        vehicle_number="RJ 14 CD 1122",
        vehicle_type="Auto / 3-Wheeler",
        model_name="Piaggio Ape City (2021)",
        owner_name="Rajesh Sharma",
        owner_email="rajesh.sharma@example.com",
        owner_phone="+91 96601 22334",
        assigned_worker_id=w8.id,
        driver_name="Mukesh Jain",
        driver_phone="+91 96600 88008",
        notes="Urban dispatch unit.",
    )
    db.add_all([v1, v2, v3, v4, v5, v6, v7, v8])
    db.commit()

    # 3. Create Documents per Vehicle
    docs = [
        # v1 (MH 12 AB 4521): Insurance Critical, PUC Valid, RC Valid, NOC Valid
        models.Document(vehicle_id=v1.id, doc_type="Insurance", doc_number="BAJAJ-ALL-88210", issuing_authority="Bajaj Allianz", expiry_date=today + timedelta(days=5)),
        models.Document(vehicle_id=v1.id, doc_type="PUC", doc_number="PUC-MH12-9901", issuing_authority="RTO Pune Emission Centre", expiry_date=date(2027, 1, 15)),
        models.Document(vehicle_id=v1.id, doc_type="RC", doc_number="RC-MH12-2022-4521", issuing_authority="RTO Pune (MH-12)", expiry_date=date(2030, 3, 12)),
        models.Document(vehicle_id=v1.id, doc_type="NOC", doc_number="NOC-MH12-2024", issuing_authority="State Transport Authority", expiry_date=date(2028, 6, 30)),
        models.Document(vehicle_id=v1.id, doc_type="Fitness", doc_number="FIT-MH12-4411", issuing_authority="RTO Pune", expiry_date=date(2027, 8, 20)),

        # v2 (DL 01 CA 7890): Insurance Valid, PUC Critical, RC Valid, NOC Valid
        models.Document(vehicle_id=v2.id, doc_type="Insurance", doc_number="ICICI-LOMB-77291", issuing_authority="ICICI Lombard", expiry_date=date(2026, 11, 20)),
        models.Document(vehicle_id=v2.id, doc_type="PUC", doc_number="PUC-DL01-3312", issuing_authority="Delhi Pollution Testing Unit", expiry_date=today + timedelta(days=4)),
        models.Document(vehicle_id=v2.id, doc_type="RC", doc_number="RC-DL01-2021-7890", issuing_authority="Delhi Mall Road RTO", expiry_date=date(2031, 7, 5)),
        models.Document(vehicle_id=v2.id, doc_type="NOC", doc_number="NOC-DL01-9988", issuing_authority="Transport Dept Delhi", expiry_date=date(2028, 12, 10)),
        models.Document(vehicle_id=v2.id, doc_type="Fitness", doc_number="FIT-DL01-5521", issuing_authority="Delhi Transport", expiry_date=date(2027, 4, 15)),

        # v3 (KA 05 MN 3344): Insurance Expiring, PUC Valid, RC Critical, NOC Pending
        models.Document(vehicle_id=v3.id, doc_type="Insurance", doc_number="TATA-AIG-55442", issuing_authority="Tata AIG", expiry_date=today + timedelta(days=18)),
        models.Document(vehicle_id=v3.id, doc_type="PUC", doc_number="PUC-KA05-2299", issuing_authority="Bangalore South RTO", expiry_date=date(2027, 2, 22)),
        models.Document(vehicle_id=v3.id, doc_type="RC", doc_number="RC-KA05-2020-3344", issuing_authority="RTO Bangalore Jayanagar", expiry_date=today + timedelta(days=3)),
        models.Document(vehicle_id=v3.id, doc_type="NOC", doc_number="NOC-PENDING-01", issuing_authority="Pending State Clearance", expiry_date=today + timedelta(days=90), notes="Pending clearance certificate."),

        # v4 (GJ 01 KL 5577): Insurance Expired, PUC Expired, RC Valid, NOC Valid
        models.Document(vehicle_id=v4.id, doc_type="Insurance", doc_number="HDFC-ERGO-33991", issuing_authority="HDFC ERGO", expiry_date=today - timedelta(days=14)),
        models.Document(vehicle_id=v4.id, doc_type="PUC", doc_number="PUC-GJ01-6677", issuing_authority="Ahmedabad RTO Testing", expiry_date=today - timedelta(days=28)),
        models.Document(vehicle_id=v4.id, doc_type="RC", doc_number="RC-GJ01-2023-5577", issuing_authority="RTO Ahmedabad (GJ-01)", expiry_date=date(2033, 9, 28)),
        models.Document(vehicle_id=v4.id, doc_type="NOC", doc_number="NOC-GJ01-8812", issuing_authority="Gujarat Transport Dept", expiry_date=date(2029, 3, 14)),
        models.Document(vehicle_id=v4.id, doc_type="Fitness", doc_number="FIT-GJ01-1199", issuing_authority="RTO Ahmedabad", expiry_date=date(2028, 5, 20)),

        # v5 (MH 14 PQ 6612): All Valid
        models.Document(vehicle_id=v5.id, doc_type="Insurance", doc_number="NEW-INDIA-11882", issuing_authority="New India Assurance", expiry_date=date(2027, 4, 30)),
        models.Document(vehicle_id=v5.id, doc_type="PUC", doc_number="PUC-MH14-4488", issuing_authority="Pimpri Chinchwad RTO", expiry_date=date(2026, 12, 18)),
        models.Document(vehicle_id=v5.id, doc_type="RC", doc_number="RC-MH14-2023-6612", issuing_authority="RTO PCMC (MH-14)", expiry_date=date(2033, 6, 14)),
        models.Document(vehicle_id=v5.id, doc_type="NOC", doc_number="NOC-MH14-9912", issuing_authority="Maharashtra Motor Vehicle Dept", expiry_date=date(2029, 8, 12)),
        models.Document(vehicle_id=v5.id, doc_type="Fitness", doc_number="FIT-MH14-8833", issuing_authority="RTO PCMC", expiry_date=date(2028, 1, 10)),
        models.Document(vehicle_id=v5.id, doc_type="Road Tax", doc_number="TAX-MH14-2023", issuing_authority="Govt of Maharashtra", expiry_date=date(2028, 10, 15)),

        # v6 (UP 32 GH 8845): All Valid
        models.Document(vehicle_id=v6.id, doc_type="Insurance", doc_number="UNITED-IND-44221", issuing_authority="United India Insurance", expiry_date=date(2027, 8, 7)),
        models.Document(vehicle_id=v6.id, doc_type="PUC", doc_number="PUC-UP32-1100", issuing_authority="Lucknow Transport Emission", expiry_date=date(2027, 1, 30)),
        models.Document(vehicle_id=v6.id, doc_type="RC", doc_number="RC-UP32-2022-8845", issuing_authority="RTO Lucknow (UP-32)", expiry_date=date(2032, 4, 2)),
        models.Document(vehicle_id=v6.id, doc_type="NOC", doc_number="NOC-UP32-7721", issuing_authority="UP Transport Authority", expiry_date=date(2028, 11, 20)),
        models.Document(vehicle_id=v6.id, doc_type="Fitness", doc_number="FIT-UP32-3311", issuing_authority="RTO Lucknow", expiry_date=date(2027, 12, 5)),
        models.Document(vehicle_id=v6.id, doc_type="Permit", doc_number="ALL-INDIA-TOURIST-8845", issuing_authority="State Transport Authority UP", expiry_date=date(2028, 9, 30)),

        # v7 (TN 09 RT 2211)
        models.Document(vehicle_id=v7.id, doc_type="Insurance", doc_number="ROYAL-SUND-99221", issuing_authority="Royal Sundaram", expiry_date=date(2027, 3, 15)),
        models.Document(vehicle_id=v7.id, doc_type="PUC", doc_number="PUC-TN09-8811", issuing_authority="Chennai RTO", expiry_date=date(2027, 2, 20)),
        models.Document(vehicle_id=v7.id, doc_type="RC", doc_number="RC-TN09-2019-2211", issuing_authority="RTO Chennai West (TN-09)", expiry_date=date(2034, 5, 10)),
        models.Document(vehicle_id=v7.id, doc_type="NOC", doc_number="NOC-TN09-5511", issuing_authority="Tamil Nadu Transport", expiry_date=date(2028, 4, 18)),

        # v8 (RJ 14 CD 1122)
        models.Document(vehicle_id=v8.id, doc_type="Insurance", doc_number="ORIENTAL-INS-77119", issuing_authority="Oriental Insurance", expiry_date=date(2027, 8, 25)),
        models.Document(vehicle_id=v8.id, doc_type="PUC", doc_number="PUC-RJ14-4422", issuing_authority="Jaipur RTO Centre", expiry_date=date(2027, 4, 14)),
        models.Document(vehicle_id=v8.id, doc_type="RC", doc_number="RC-RJ14-2021-1122", issuing_authority="RTO Jaipur South (RJ-14)", expiry_date=date(2031, 9, 19)),
        models.Document(vehicle_id=v8.id, doc_type="NOC", doc_number="NOC-RJ14-3321", issuing_authority="Rajasthan Transport Authority", expiry_date=date(2029, 1, 10)),
    ]
    db.add_all(docs)
    db.commit()
    print("Database seeded with VehicleDoc fleet data!")
