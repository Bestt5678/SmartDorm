# SmartDorm

## บทบาทผู้ใช้งาน

| Role | สิทธิ์หลัก |
| --- | --- |
| TENANT | จองห้อง, ดูการจอง/สัญญา/ใบแจ้งหนี้/การชำระเงินของตนเอง, แนบสลิป, แจ้งซ่อม, แก้ข้อมูลส่วนตัว |
| STAFF | ดูภาพรวม และจัดการห้อง ผู้เช่า การจอง สัญญา มิเตอร์ ใบแจ้งหนี้ การชำระเงิน งานซ่อม |
| ADMIN | ทุกอย่างของ STAFF และจัดการพนักงาน (รวมถึงสร้างบัญชีเข้าสู่ระบบให้พนักงาน) |

## เปิดเว็บ

- npm run dev:backend → Backend API: http://localhost:3000/api
- npm run dev:frontend → Frontend: http://localhost:5173

## บัญชีทดลอง

| บทบาท | อีเมล | รหัสผ่าน |
| --- | --- | --- |
| ผู้ดูแลระบบ | admin@smartdorm.local | 12345678 |
| พนักงาน | staff@smartdorm.local | 12345678 |
| ผู้เช่า | tenant@smartdorm.local | 12345678 |

## Scripts

| คำสั่ง | คำอธิบาย |
| --- | --- |
| npm run install:all | ติดตั้ง dependencies ทั้ง backend และ frontend |
| npm run dev:backend | รัน backend ในโหมด watch |
| npm run dev:frontend | รัน frontend ด้วย Vite |
| npm run build:backend | build backend ไปที่ backend/dist |
| npm run build:frontend | typecheck และ build frontend |
| npm run lint --prefix frontend | ตรวจ ESLint ฝั่ง frontend |
| npm run typecheck | ตรวจ TypeScript ของ backend (source และ tests) และ build frontend |
| npm run test | รัน integration tests กับฐานข้อมูลทดสอบ |
| npm run test:watch --prefix backend | รัน tests แบบ watch |
| npm run db:deploy | apply migration ที่มีอยู่ |
| npm run db:migrate | สร้าง migration ใหม่ระหว่างพัฒนา |
| npm run db:seed | ล้างข้อมูลทั้งหมด แล้วใส่ข้อมูลตั้งต้น (ห้อง พนักงาน ผู้เช่า บัญชีทดลอง) |

## การรันเทสต์ (backend)

```powershell
Copy-Item backend/.env.example backend/.env.test
# กรอกค่าใน .env.test โดย DATABASE_URL ต้องชี้ไปที่ฐานข้อมูลที่ลงท้ายด้วย _test
npm run test --prefix backend
```
