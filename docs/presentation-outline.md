# SmartDorm Presentation Outline

## Slide 1 - Title
- SmartDorm: ระบบจองและจัดการหอพักออนไลน์
- ชื่อสมาชิกในทีม
- วิชา / อาจารย์ที่ปรึกษา / วันที่นำเสนอ

## Slide 2 - Problem and Goal
- ปัญหา: การจองห้องพักและงานเอกสารเดิมกระจัดกระจาย ไม่มีศูนย์กลางติดตามสถานะ
- เป้าหมาย: รวมการค้นหาห้อง จอง สัญญา ใบแจ้งหนี้ การชำระเงิน และแจ้งซ่อมไว้ในระบบเดียว
- ผลลัพธ์ที่คาดหวัง: ผู้เช่าจองได้ด้วยตนเอง และผู้ดูแลจัดการข้อมูลได้เป็นระบบ

## Slide 3 - Scope
- In scope
  - ค้นหาและดูรายละเอียดห้องพัก
  - สมัครสมาชิกและเข้าสู่ระบบ (อีเมล หรือ Google / LINE / Facebook)
  - จองห้องและติดตามสถานะการจอง
  - สัญญาเช่า ใบแจ้งหนี้ และการชำระเงินแบบ Mock
  - แจ้งซ่อมและติดตามสถานะ
  - หลังบ้านสำหรับ ADMIN / STAFF
- Out of scope
  - Payment gateway จริง
  - ระบบแชทหรือแจ้งเตือนผ่าน LINE/Email
  - Mobile application
  - การยืนยันตัวตนด้วย OTP หรือ e-KYC

## Slide 4 - User Roles
- `TENANT`: ค้นหาห้อง จองห้อง ดูใบแจ้งหนี้ ชำระเงิน แจ้งซ่อม
- `STAFF`: ดูภาพรวม รับงานซ่อม ดูแลการจองและผู้เช่า
- `ADMIN`: จัดการห้อง ยืนยันการจอง ออกใบแจ้งหนี้ และจัดการเอกสารทั้งหมด

## Slide 5 - System Architecture
- Frontend: React + TypeScript + Zod + Tailwind CSS + Axios (build ด้วย Vite, หน้าจัดการข้อมูลสร้างจาก config ของแต่ละตาราง)
- Backend: Node.js + Express + TypeScript + Zod + Prisma
- Database: PostgreSQL
- Auth: JWT + bcrypt และ OAuth 2.0 (Google / LINE / Facebook)
- API: REST (`/api/...`)
- Diagram suggestion: Browser -> React SPA -> Express API -> Prisma -> PostgreSQL
- หมายเหตุ: แสดงลำดับการเรียก API และการตรวจสอบ role ใน middleware

## Slide 6 - Database Design
- ตารางหลัก: `room_type`, `room`, `tenant`, `booking`, `contract`, `invoice`, `payment`
- ตารางสนับสนุน: `staff`, `utility_meter`, `repair_request`, `account`
- ความสัมพันธ์สำคัญ
  - `room_type` 1:N `room`
  - `tenant` 1:N `booking`
  - `booking` 1:1 `contract`
  - `contract` 1:N `invoice`
  - `invoice` 1:N `payment`
  - `room` 1:N `utility_meter` และ `repair_request`
- จุดออกแบบเพิ่มเติม
  - เพิ่ม `account` สำหรับ login
  - เพิ่ม `deposit_amount`, `invoice_type` และรูป/สิ่งอำนวยความสะดวกของประเภทห้อง
  - ใช้ partial unique index ป้องกันห้องถูกจองซ้ำขณะมี booking ที่ยัง active

## Slide 7 - Key Business Flows
- Flow 1: ค้นหาห้อง -> ดูรายละเอียด -> ส่งคำขอจอง
- Flow 2: ADMIN ยืนยันการจอง -> สร้างสัญญา -> สร้างใบแจ้งหนี้เงินมัดจำ
- Flow 3: ผู้เช่าดูใบแจ้งหนี้ -> อัปโหลดสลิป -> STAFF/ADMIN ตรวจสอบและอนุมัติ/ปฏิเสธ -> สถานะเปลี่ยนเป็นชำระบางส่วน/ชำระแล้ว
- Flow 4: ผู้เช่าแจ้งซ่อม -> STAFF รับงาน/อัปเดตสถานะ -> เสร็จสิ้น
- แสดง state diagram ของ `booking`, `invoice`, `repair_request`

## Slide 8 - Frontend Screens
- หน้าแรก: hero, ค้นหาห้อง, ประเภทห้อง, ห้องว่างแนะนำ
- หน้ารายการห้อง: filter ตามประเภท/ชั้น/สถานะ/คำค้น
- หน้ารายละเอียดห้อง: รูปภาพ, สิ่งอำนวยความสะดวก, ปุ่มจอง
- หน้าผู้เช่า: การจองของฉัน, ใบแจ้งหนี้, ชำระเงิน, แจ้งซ่อม
- หน้าหลังบ้าน: dashboard, ห้องพัก, การจอง, ใบแจ้งหนี้, งานซ่อม, ผู้เช่า

## Slide 9 - Backend and Security
- แยกชั้น routes -> services -> Prisma
- Validation ด้วย Zod ทุก endpoint สำคัญ
- Role-based authorization ด้วย middleware
- Password hash ด้วย bcrypt, token ด้วย JWT
- ความปลอดภัยเพิ่มเติม: helmet, CORS, rate limit
- หมายเหตุ: อย่า commit `.env` หรือ secret ลง repository

## Slide 10 - Demo Script
1. เปิดหน้าแรกและค้นหาห้องว่าง
2. Login เป็นผู้เช่าและส่งคำขอจอง
3. Login เป็น ADMIN เพื่อยืนยันการจองและออกสัญญา
4. Login เป็นผู้เช่าเพื่อดูใบแจ้งหนี้และชำระเงิน
5. แจ้งซ่อมและ Login เป็น STAFF เพื่ออัปเดตงานซ่อม
6. เปิด dashboard เพื่อดูภาพรวมและรายได้

## Slide 11 - Testing and Limitations
- ผ่านการตรวจ TypeScript และ build ทั้ง frontend/backend
- ผ่าน ESLint ฝั่ง frontend
- Integration tests ของ API (Vitest + Supertest) 77 กรณี ครอบคลุมทุกกลุ่ม endpoint รันบนฐานข้อมูล `_test` แยก และรันอัตโนมัติใน GitHub Actions
- ข้อจำกัด
  - การชำระเงินเป็นการอัปโหลดสลิปและตรวจสอบด้วยคน ไม่มี payment gateway จริง
  - ต้องตั้งค่า PostgreSQL และ `.env` ก่อนรัน
  - ข้อมูลตัวอย่างมาจาก seed script

## Slide 12 - Team Responsibilities
| งาน | ผู้รับผิดชอบ | รายละเอียด |
| --- | --- | --- |
| UX/UI และ Frontend | ชื่อสมาชิก | หน้าเว็บ, components, responsive |
| Backend API | ชื่อสมาชิก | routes, services, validation, auth |
| Database และ Prisma | ชื่อสมาชิก | schema, migration, seed |
| Testing และ Deployment | ชื่อสมาชิก | ตรวจ build, ทดสอบ flow, เอกสาร |
| Presentation | ชื่อสมาชิก | สไลด์, demo script, Q&A |

## Slide 13 - Next Steps and Q&A
- เพิ่ม end-to-end tests ฝั่ง frontend
- เพิ่มการแจ้งเตือนผ่าน Email/LINE
- เชื่อมต่อ payment gateway จริง
- ปรับ dashboard ให้มีรายงานเชิงลึก
- Q&A
