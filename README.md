# Booking Service

Sale Service — Booking Module  
**Stack:** Node.js + Express + PostgreSQL + KafkaJS

---

## โครงสร้างไฟล์

```
booking-service/
├── src/
│   ├── index.js                       # Entry point + Kafka consumer
│   ├── db/index.js                    # PostgreSQL connection + migration
│   ├── kafka/index.js                 # Producer & Consumer
│   ├── routes/booking.routes.js
│   ├── controllers/booking.controller.js
│   └── services/booking.service.js    # Business logic ทั้งหมด
├── .env.example
└── package.json
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bookings` | ดึง booking ทั้งหมด (filter: customerId, propertyId, status) |
| GET | `/api/bookings/:id` | ดึงด้วย UUID หรือ booking_id (BK-YYYYMMDD-XXXX) |
| POST | `/api/bookings` | สร้าง booking ใหม่ (manual) |
| PATCH | `/api/bookings/:id/status` | อัปเดต status |
| PATCH | `/api/bookings/:id/kyc` | อัปเดต KYC status |
| PATCH | `/api/bookings/:id/second-payment` | อัปเดต second payment (auto update inventory → Sold) |
| PATCH | `/api/bookings/:id/contract` | บันทึก contract ID จาก legal |
| GET | `/health` | Health check |

---

## Kafka Topics

| Direction | Topic | Description |
|-----------|-------|-------------|
| Subscribe | `sale.reservationcreated.complete` | สร้าง booking อัตโนมัติหลัง reservation สำเร็จ |
| Subscribe | `payment.firstpayment.completed` | อัปเดต KYC status หลัง first payment |
| Publish | `sale.booked.complete` | แจ้ง inventory/legal ว่า booking สำเร็จ |

---

## Property Status Flow

```
Reserved (Reservation) → Booked (Booking) → Sold (Second Payment Confirmed)
```

---

## วิธีรัน

```bash
npm install
cp .env.example .env
npm run dev
```

---

## ตัวอย่าง Request Body (POST /api/bookings)

```json
{
  "reservationId": "RES-20260430-0001",
  "customerId": "CUST-001",
  "propertyId": "PROP-001",
  "projectName": "The Grand",
  "location": "Bangkok",
  "roomType": "2BR",
  "roomNumber": "101",
  "price": 5000000,
  "pricePerUnit": 100000,
  "promotion": "PROMO-2026"
}
```
