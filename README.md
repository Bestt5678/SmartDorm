# SmartDorm

## บทบาทผู้ใช้งาน

| Role | สิทธิ์หลัก |
| --- | --- |
| TENANT | จองห้อง, ดูการจอง/สัญญา/ใบแจ้งหนี้/การชำระเงินของตนเอง, แนบสลิป, แจ้งซ่อม, แก้ข้อมูลส่วนตัว |
| STAFF | ดูภาพรวม และจัดการห้อง ผู้เช่า การจอง สัญญา มิเตอร์ ใบแจ้งหนี้ การชำระเงิน งานซ่อม |
| ADMIN | ทุกอย่างของ STAFF และจัดการพนักงาน (รวมถึงสร้างบัญชีเข้าสู่ระบบให้พนักงาน) |

## เริ่มต้นใช้งาน

```powershell
npm run install:all
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
# กรอก DATABASE_URL และ JWT_SECRET ใน backend/.env
npm run db:deploy
npm run db:seed
```

ค่าอื่นใน .env เว้นว่างได้ ระบบจะใช้ค่าเริ่มต้นจาก backend/src/config/env.ts

| ค่า | ค่าเริ่มต้น |
| --- | --- |
| PORT | 3000 |
| CORS_ORIGIN | http://localhost:5173 |
| JWT_EXPIRES_IN | 7d |
| UPLOAD_DIR | uploads |
| WATER_RATE | 18 (บาท/หน่วย) |
| ELECTRIC_RATE | 8 (บาท/หน่วย) |
| VITE_API_URL (frontend) | /api (Vite ส่งต่อไปที่ backend ให้) |

## เปิดเว็บ

- npm run dev:backend → Backend API: http://localhost:3000/api
- npm run dev:frontend → Frontend: http://localhost:5173

## บัญชีทดลอง

| บทบาท | อีเมล | รหัสผ่าน |
| --- | --- | --- |
| ผู้ดูแลระบบ | admin@smartdorm.local | 12345678 |
| พนักงาน | staff@smartdorm.local | 12345678 |
| ผู้เช่า | tenant@smartdorm.local | 12345678 |

## โครงสร้างโปรเจกต์

| โฟลเดอร์ | มีอะไร |
| --- | --- |
| backend/src/routes | API แยกไฟล์ตามเรื่อง (ห้อง การจอง สัญญา ใบแจ้งหนี้ การชำระเงิน ฯลฯ) |
| backend/src/lib | ฟังก์ชันช่วย: คำนวณยอดใบแจ้งหนี้ วันที่เวลาไทย อัปโหลดสลิป สร้างและตรวจ token |
| backend/src/middleware | ตรวจ token และสิทธิ์ตามบทบาท |
| backend/prisma | schema ฐานข้อมูล, migrations, ข้อมูลตั้งต้น (seed) |
| frontend/src/pages | หน้าจัดการข้อมูลหลังเข้าสู่ระบบ (หนึ่งไฟล์ต่อหนึ่งเมนู) |
| frontend/src/features | หน้าแรก, เข้าสู่ระบบ/สมัครสมาชิก, ภาพรวม, ข้อมูลส่วนตัว |
| frontend/src/components | ชิ้นส่วนที่ใช้ร่วมกัน เช่น ปุ่ม ช่องกรอก ป้ายสถานะ (SharedUI.tsx) และ header/footer |
| frontend/src/api | ตัวเรียก API (axios) |

จัดรูปแบบโค้ดด้วย Prettier ตามไฟล์ .prettierrc ถ้าใช้ VS Code ให้ติดตั้งส่วนเสริม Prettier แล้วโค้ดจะถูกจัดให้อัตโนมัติตอนบันทึก

## Scripts

| คำสั่ง | คำอธิบาย |
| --- | --- |
| npm run install:all | ติดตั้ง dependencies ทั้ง backend และ frontend |
| npm run dev:backend | รัน backend ในโหมด watch |
| npm run dev:frontend | รัน frontend ด้วย Vite |
| npm run build:backend | build backend ไปที่ backend/dist |
| npm run build:frontend | typecheck และ build frontend |
| npm run lint --prefix frontend | ตรวจ ESLint ฝั่ง frontend |
| npm run typecheck | ตรวจ TypeScript ของ backend และ build frontend |
| npm run test | รัน integration tests กับฐานข้อมูลทดสอบ |
| npm run test:watch --prefix backend | รัน tests แบบ watch |
| npm run db:deploy | apply migration ที่มีอยู่ |
| npm run db:migrate | สร้าง migration ใหม่ระหว่างพัฒนา |
| npm run db:seed | ล้างข้อมูลทั้งหมด แล้วใส่ข้อมูลตัวอย่าง (ห้อง ผู้เช่า การจอง สัญญา ใบแจ้งหนี้ การชำระเงิน แจ้งซ่อม และบัญชีทดลอง) |
