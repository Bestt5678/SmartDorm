# SmartDorm API

Base URL: http://localhost:3000/api
ตอนพัฒนา frontend เรียกผ่าน Vite proxy ที่ http://localhost:5173/api

ทุก endpoint ที่ต้องใช้สิทธิ์ให้ส่ง header:

```http
Authorization: Bearer <jwt>
```

## รูปแบบข้อมูล

- **ชื่อ field เป็น snake_case ทั้ง request และ response** เช่น room_id, monthly_rate, move_in_date (request ที่ส่ง camelCase มาก็ยังรับได้)
- **GET แบบรายการ (list) คืนเป็น array ตรงๆ** ไม่มี pagination ถ้าต้องการจำกัดจำนวนให้ใช้ ?limit=
- ตัวเลขทศนิยม (เงิน หน่วยมิเตอร์) ส่งกลับเป็น string เช่น "3800" ส่วนวันที่เป็น ISO string
- ใน list มีข้อมูลที่ join มาให้ด้วย เช่น booking.room, booking.tenant ไม่ต้องเรียกซ้ำ

## Roles

| Role | สิทธิ์หลัก |
| --- | --- |
| TENANT | จองห้อง ดูข้อมูลของตัวเอง (การจอง สัญญา ใบแจ้งหนี้ การชำระเงิน งานซ่อม) อัปโหลดสลิป แจ้งซ่อม |
| STAFF | จัดการห้อง ผู้เช่า การจอง สัญญา มิเตอร์ ใบแจ้งหนี้ การชำระเงิน และงานซ่อม ดูภาพรวม |
| ADMIN | ทุกอย่างที่ STAFF ทำได้ และจัดการพนักงาน |

**List แบบแยกตามบทบาท:** GET /bookings, /contracts, /invoices, /payments, /repair-requests ถ้าเรียกด้วย TENANT จะได้เฉพาะข้อมูลของตัวเอง ส่วน STAFF/ADMIN ได้ทั้งหมด

## Status

| Invoice | Payment | Booking | Repair |
| --- | --- | --- | --- |
| ค้างชำระ | รอตรวจสอบ | รอดำเนินการ | รอดำเนินการ |
| เกินกำหนด* | อนุมัติแล้ว | ยืนยันแล้ว | กำลังดำเนินการ |
| รอตรวจสอบ | ปฏิเสธ | ยกเลิก | เสร็จสิ้น |
| ชำระบางส่วน | | เสร็จสิ้น | ยกเลิก |
| ชำระแล้ว | | | |
| ยกเลิก | | | |

\* เกินกำหนด คือใบที่ยัง ค้างชำระ และเลยวันครบกำหนดแล้ว ระบบคำนวณตอนแสดงผล ไม่ได้เก็บลงฐานข้อมูล

- สถานะใบแจ้งหนี้คำนวณจากการชำระเงินอัตโนมัติ (ตั้งค่าเองไม่ได้)
- เฉพาะ payment ที่ อนุมัติแล้ว เท่านั้นที่ถูกนับเป็นยอดชำระ

## Auth

| Method | Endpoint | สิทธิ์ |
| --- | --- | --- |
| POST | /auth/register | public (สมัครเป็นผู้เช่า) |
| POST | /auth/login | public |
| GET | /auth/me | authenticated |
| PATCH | /auth/me | ผู้เช่า แก้ full_name, id_card_no, phone |

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "tenant@smartdorm.local",
  "password": "12345678",
  "role": "TENANT"
}
```

role ไม่บังคับ ถ้าส่งมาแล้วไม่ตรงกับบัญชีจะได้ 403 เช่น "บัญชีนี้เป็นบัญชีผู้เช่า กรุณาเลือกแท็บ ผู้เช่า"

Response (/auth/register คืนรูปแบบเดียวกัน ส่วน /auth/me คืนเฉพาะ user):

```json
{
  "token": "<jwt>",
  "user": {
    "id": 3,
    "name": "เช่า หนึ่ง",
    "role": "TENANT",
    "email": "tenant@smartdorm.local",
    "tenant_id": 1,
    "staff_id": null,
    "phone": "0812345678"
  }
}
```

## Rooms และ Room types

| Method | Endpoint | สิทธิ์ |
| --- | --- | --- |
| GET | /room-types | public |
| POST / PATCH / DELETE | /room-types[/:id] | STAFF, ADMIN |
| GET | /rooms, /rooms/:id | public |
| POST / PATCH / DELETE | /rooms[/:id] | STAFF, ADMIN |

Query ของ /rooms: type_id, floor, status, min_price, max_price, q, limit

## Tenants และ Staff

| Method | Endpoint | สิทธิ์ |
| --- | --- | --- |
| GET | /tenants, /tenants/:id | STAFF, ADMIN |
| POST | /tenants | STAFF, ADMIN เพิ่มผู้เช่า walk-in (ไม่มีบัญชี) |
| PATCH / DELETE | /tenants/:id | STAFF, ADMIN ลบได้เฉพาะผู้เช่าที่ไม่มีประวัติการจอง |
| GET | /staff | STAFF, ADMIN |
| POST | /staff | ADMIN ส่ง email + password มาด้วยเพื่อสร้างบัญชีเข้าสู่ระบบ |
| PATCH / DELETE | /staff/:id | ADMIN |

## Bookings

| Method | Endpoint | สิทธิ์ |
| --- | --- | --- |
| GET | /bookings | authenticated (ผู้เช่าเห็นของตัวเอง) |
| GET | /bookings/:id | เจ้าของ หรือ STAFF/ADMIN |
| POST | /bookings | ผู้เช่าจองให้ตัวเอง ส่วน STAFF/ADMIN ต้องส่ง tenant_id |
| DELETE | /bookings/:id | STAFF, ADMIN เฉพาะการจองที่ยังไม่มีสัญญา |
| POST | /bookings/:id/confirm | STAFF, ADMIN |
| POST | /bookings/:id/cancel | เจ้าของ หรือ STAFF/ADMIN |
| POST | /bookings/:id/complete | STAFF, ADMIN |

```http
POST /bookings
{ "room_id": 5, "move_in_date": "2026-12-01" }
```

- การจองจะเปลี่ยนห้องเป็น ไม่ว่าง ทันที และกันการจองซ้ำด้วย partial unique index

### Confirm booking

```http
POST /bookings/1/confirm
{ "start_date": "2026-12-01", "end_date": "2027-11-30", "deposit": 5000, "due_date": "2026-12-01" }
```

จะสร้างสัญญาเช่าและใบแจ้งหนี้เงินมัดจำให้อัตโนมัติ (due_date ไม่บังคับ ถ้าไม่ใส่จะใช้วันเริ่มสัญญา)

### Cancel / Complete

- **ยกเลิก:** ทำได้เมื่อสถานะเป็น รอดำเนินการ หรือ ยืนยันแล้ว และไม่มี payment ที่ อนุมัติแล้ว ระบบจะเปลี่ยน payment ที่ รอตรวจสอบ เป็น ปฏิเสธ และยกเลิกใบแจ้งหนี้ทั้งหมดของสัญญา
- **ปิดสัญญา (complete):** ต้องเป็นการจองที่ ยืนยันแล้ว และไม่มีใบแจ้งหนี้ค้าง เมื่อสำเร็จห้องจะกลับเป็น ว่าง

## Contracts

| Method | Endpoint | สิทธิ์ |
| --- | --- | --- |
| GET | /contracts | authenticated (ผู้เช่าเห็นของตัวเอง) |
| GET | /contracts/:id | เจ้าของ หรือ STAFF/ADMIN |
| POST | /contracts | STAFF, ADMIN |
| PATCH | /contracts/:id | STAFF, ADMIN แก้ start_date, end_date, deposit |
| DELETE | /contracts/:id | STAFF, ADMIN |

- POST /contracts รับ { booking_id, start_date, end_date, deposit } และทำงานเหมือนการยืนยันการจอง (การจองต้องเป็น รอดำเนินการ)
- DELETE ทำได้เมื่อยังไม่มีรายการชำระเงิน ระบบจะลบใบแจ้งหนี้ของสัญญาและคืนการจองเป็น รอดำเนินการ

## Utility meters

| Method | Endpoint | สิทธิ์ |
| --- | --- | --- |
| GET | /utility-meters | STAFF, ADMIN |
| POST / PATCH / DELETE | /utility-meters[/:id] | STAFF, ADMIN |

- Query: room_id, month (YYYY-MM), limit
- ห้องเดียวกันบันทึกได้เดือนละ 1 ครั้ง
- ลบมิเตอร์ที่ออกใบแจ้งหนี้แล้วไม่ได้

## Invoices

| Method | Endpoint | สิทธิ์ |
| --- | --- | --- |
| GET | /invoices | authenticated (ผู้เช่าเห็นของตัวเอง) |
| GET | /invoices/:id | เจ้าของ หรือ STAFF/ADMIN |
| POST | /invoices | STAFF, ADMIN |
| PATCH | /invoices/:id | STAFF, ADMIN |
| DELETE | /invoices/:id | STAFF, ADMIN เฉพาะใบที่ยังไม่มีรายการชำระเงิน |
| POST | /invoices/:id/cancel | STAFF, ADMIN |

```http
POST /invoices
{ "contract_id": 1, "meter_id": 3, "due_date": "2026-12-31", "rent_amount": 4500, "invoice_type": "UTILITY" }
```

- ถ้าใส่ meter_id ระบบจะคำนวณค่าน้ำ/ค่าไฟจากมิเตอร์และอัตราใน env (WATER_RATE, ELECTRIC_RATE) และมิเตอร์หนึ่งตัวออกใบแจ้งหนี้ได้ใบเดียว
- PATCH แก้ได้แค่วันครบกำหนดและยอดเงิน แต่แก้ไม่ได้ถ้าใบนั้น ชำระแล้ว/ยกเลิก หรือยังมี payment รอตรวจสอบ
- ยกเลิกได้เมื่อไม่มี payment ที่ รอตรวจสอบ หรือ อนุมัติแล้ว
- response มี field คำนวณเพิ่ม คือ total_amount, paid_amount, balance

## Payments

| Method | Endpoint | สิทธิ์ |
| --- | --- | --- |
| GET | /payments | authenticated (ผู้เช่าเห็นของตัวเอง) |
| POST | /payments | STAFF, ADMIN บันทึกรับเงิน ได้สถานะ อนุมัติแล้ว ทันที |
| DELETE | /payments/:id | STAFF, ADMIN แล้วคำนวณสถานะใบแจ้งหนี้ใหม่ |
| POST | /invoices/:id/payments | เจ้าของ (ต้องแนบสลิป) หรือ STAFF/ADMIN |
| GET | /payments/:id/slip | เจ้าของ หรือ STAFF/ADMIN |
| POST | /payments/:id/approve | STAFF, ADMIN |
| POST | /payments/:id/reject | STAFF, ADMIN ส่ง { "note": "..." } ได้ |

```http
POST /payments
{ "invoice_id": 1, "amount": 3800, "payment_type": "เงินสด" }
```

### ผู้เช่าอัปโหลดสลิป

```http
POST /invoices/1/payments
Content-Type: multipart/form-data

amount=400
payment_type=โอนเงิน
slip=@slip.png
```

- ไฟล์ต้องเป็น JPG, PNG, WEBP หรือ PDF ไม่เกิน 5MB ระบบตรวจ magic bytes ของไฟล์ด้วย
- ผู้เช่ามี payment รอตรวจสอบ ได้ครั้งละ 1 รายการต่อใบแจ้งหนี้ และยอดต้องไม่เกินยอดคงเหลือ
- การอนุมัติจะตรวจยอดคงเหลือซ้ำอีกรอบ (กันการอนุมัติพร้อมกัน) สถานะใบแจ้งหนี้คำนวณตามลำดับ ชำระแล้ว > รอตรวจสอบ > ชำระบางส่วน > ค้างชำระ
- endpoint ดูสลิปต้องแนบ Bearer token frontend จึงต้องดาวน์โหลดเป็น blob ก่อนเปิด

## Repair requests

| Method | Endpoint | สิทธิ์ |
| --- | --- | --- |
| GET | /repair-requests | authenticated (ผู้เช่าเห็นงานของห้องที่ตัวเองเช่า) |
| POST | /repair-requests | ผู้เช่า (ห้องที่มีสัญญาอยู่) หรือ STAFF/ADMIN |
| PATCH | /repair-requests/:id | STAFF, ADMIN ส่ง status และ/หรือ staff_id |
| DELETE | /repair-requests/:id | STAFF, ADMIN |

- staff_id และ status ตอนสร้างใช้ได้เฉพาะ STAFF/ADMIN
- STAFF มอบหมายงานได้เฉพาะให้ตัวเอง และแก้งานที่คนอื่นรับไว้แล้วไม่ได้
- Query: status, room_id, staff_id, limit

## Dashboard และ Settings

| Method | Endpoint | สิทธิ์ |
| --- | --- | --- |
| GET | /dashboard/summary | STAFF, ADMIN |
| GET | /settings | STAFF, ADMIN คืนอัตราค่าน้ำ/ค่าไฟ |
| GET | /health | public (อยู่นอก /api) |

Dashboard คำนวณรายได้รายเดือนตาม timezone ใน APP_TIMEZONE (ค่าเริ่มต้น Asia/Bangkok)

## Error format

```json
{ "message": "คำอธิบายข้อผิดพลาด" }
```

Validation error (path เป็น snake_case):

```json
{
  "message": "ข้อมูลไม่ถูกต้อง",
  "errors": [{ "path": "amount", "message": "ยอดชำระต้องมากกว่า 0" }]
}
```
