# SmartDorm

ระบบจองห้องพักและจัดการหอพักออนไลน์ ประกอบด้วย frontend (React + Vite) และ backend (Express + Prisma + PostgreSQL)

## Tech Stack

| ส่วน | เทคโนโลยี | ใช้ทำอะไร |
| --- | --- | --- |
| Frontend | **React** 18 + **TypeScript** | หน้าเว็บทั้งหมด (build ด้วย Vite) |
| | **Zod** 4 | ตรวจข้อมูลในฟอร์ม และตรวจรูปแบบข้อมูลที่ได้จาก API |
| | **Tailwind CSS** 4 | จัดหน้าตาและธีมสีไม้ (`src/styles/index.css`) |
| | **Axios** | เรียก API พร้อมแนบ JWT อัตโนมัติ (`src/api/client.ts`) |
| Backend | **Node.js** 20+ + **Express** 5 + **TypeScript** | REST API (`/api/...`) |
| | **Zod** 4 | ตรวจ request body/query และค่าใน `.env` |
| | **Prisma** 7 | ORM, migration และ seed (`backend/prisma`) |
| | **PostgreSQL** | ฐานข้อมูล (เชื่อมผ่าน `@prisma/adapter-pg`) |

library เสริม: JWT + bcrypt (auth), multer (อัปโหลดสลิป), helmet / cors / express-rate-limit (ความปลอดภัย), Vitest + Supertest (integration tests)

## ความสามารถหลัก

- หน้าแรกแสดงห้องพักและราคา กรองตามประเภทห้องได้โดยไม่ต้องเข้าสู่ระบบ
- สมัครสมาชิก / เข้าสู่ระบบด้วยอีเมล (JWT) แยกแท็บตามบทบาท
- ผู้เช่าจองห้องว่าง ยกเลิกการจอง ดูสัญญาและใบแจ้งหนี้ของตนเอง
- เจ้าหน้าที่ยืนยันการจองแล้วระบบออกสัญญาเช่าและใบแจ้งหนี้เงินมัดจำให้อัตโนมัติ
- ผู้เช่าชำระเงินโดยแนบสลิป (JPG/PNG/WEBP/PDF ไม่เกิน 5MB) แล้วเจ้าหน้าที่ตรวจ อนุมัติ หรือปฏิเสธ หรือบันทึกรับเงินสดเองได้
- ใบแจ้งหนี้คำนวณยอดคงเหลือและสถานะเอง รวมถึงสถานะ `เกินกำหนด` และคิดค่าน้ำ-ไฟจากมิเตอร์ให้
- ผู้เช่าแจ้งซ่อมห้องที่ตัวเองเช่า พนักงานรับงานและอัปเดตสถานะ
- หลังบ้าน: ภาพรวม (dashboard), ห้องพัก, ประเภทห้อง, ผู้เช่า, การจอง, สัญญา, มิเตอร์, ใบแจ้งหนี้, การชำระเงิน, แจ้งซ่อม, พนักงาน ทุกหน้าเพิ่ม/แก้ไข/ลบได้

## บทบาทผู้ใช้งาน

| Role | สิทธิ์หลัก |
| --- | --- |
| `TENANT` | จองห้อง, ดูการจอง/สัญญา/ใบแจ้งหนี้/การชำระเงินของตนเอง, แนบสลิป, แจ้งซ่อม, แก้ข้อมูลส่วนตัว |
| `STAFF` | ดูภาพรวม และจัดการห้อง ผู้เช่า การจอง สัญญา มิเตอร์ ใบแจ้งหนี้ การชำระเงิน งานซ่อม |
| `ADMIN` | ทุกอย่างของ STAFF และจัดการพนักงาน (รวมถึงสร้างบัญชีเข้าสู่ระบบให้พนักงาน) |

## โครงสร้างโปรเจกต์

```text
SmartDorm/
├─ backend/
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  ├─ migrations/
│  │  └─ seed.ts
│  ├─ src/
│  │  ├─ routes/
│  │  ├─ services/
│  │  ├─ schemas/
│  │  ├─ middleware/
│  │  ├─ lib/
│  │  ├─ app.ts
│  │  └─ server.ts
│  ├─ tests/
│  ├─ vitest.config.mts
│  ├─ .env.example
│  └─ .env.test.example
├─ frontend/
│  └─ src/
│     ├─ app/App.tsx           # header, เมนูตามบทบาท
│     ├─ api/                  # axios client + mock API (VITE_USE_MOCK)
│     ├─ components/           # ResourcePage (ตาราง/ฟอร์ม/ปุ่มต่อแถว), ui
│     ├─ features/             # config ของแต่ละตาราง, auth, dashboard, profile, registry.ts
│     ├─ hooks/
│     ├─ lib/
│     └─ main.tsx
└─ package.json
```

## สิ่งที่ต้องติดตั้ง

- Node.js 20 ขึ้นไป (ทดสอบด้วย Node.js 24)
- PostgreSQL 15 ขึ้นไป (ทดสอบด้วย PostgreSQL 18)
- npm 10 ขึ้นไป

## เริ่มต้นใช้งาน

### 0. ดาวน์โหลดโปรเจกต์

```powershell
git clone https://github.com/Bestt5678/SmartDorm.git
cd SmartDorm
```

### 1. เตรียมฐานข้อมูล

สร้างฐานข้อมูลชื่อ `smartdorm` ใน PostgreSQL:

```sql
CREATE DATABASE smartdorm;
```

หรือใช้คำสั่ง:

```powershell
createdb -U postgres smartdorm
```

### 2. ตั้งค่า environment

```powershell
Copy-Item backend/.env.example backend/.env
```

แก้ไข `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/smartdorm?schema=public"
JWT_SECRET="your-long-random-secret-at-least-32-characters"
JWT_EXPIRES_IN="7d"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
NODE_ENV="development"
APP_TIMEZONE="Asia/Bangkok"
```

> `backend/.env` ถูก ignore โดย git ไม่ควร commit รหัสผ่านหรือ secret ลงใน repository

frontend เรียก API ผ่าน Vite proxy (`/api` → `http://localhost:3000`) ถ้าจะลองหน้าเว็บโดยไม่รัน backend ให้สร้าง `frontend/.env` แล้วตั้ง `VITE_USE_MOCK=true` (ดู `frontend/.env.example`)

### 3. ติดตั้ง dependencies

```powershell
npm run install:all
```

### 4. สร้างตารางและ seed ข้อมูล

```powershell
npm run db:deploy
npm run db:seed
```

สำหรับการแก้ schema ในอนาคตระหว่างพัฒนา:

```powershell
npm run db:migrate
```

### 5. รันโปรเจกต์

เปิด terminal แยก 2 หน้าต่าง:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api (หรือผ่าน proxy ที่ http://localhost:5173/api)
- Health check: http://localhost:3000/health

## บัญชีทดลอง

| Role | Email | Password |
| --- | --- | --- |
| ผู้ดูแลระบบ | `admin@smartdorm.local` | `Admin@1234` |
| พนักงาน | `staff@smartdorm.local` | `Staff@1234` |
| ผู้เช่า | `tenant@smartdorm.local` | `Tenant@1234` |

## Scripts

| คำสั่ง | คำอธิบาย |
| --- | --- |
| `npm run install:all` | ติดตั้ง dependencies ทั้ง backend และ frontend |
| `npm run dev:backend` | รัน backend ในโหมด watch |
| `npm run dev:frontend` | รัน frontend ด้วย Vite |
| `npm run build:backend` | build backend ไปที่ `backend/dist` |
| `npm run build:frontend` | typecheck และ build frontend |
| `npm run lint --prefix frontend` | ตรวจ ESLint ฝั่ง frontend |
| `npm run typecheck` | ตรวจ TypeScript ทั้ง source และ tests (backend) |
| `npm run test` | รัน integration tests กับฐานข้อมูลทดสอบ |
| `npm run test:watch` | รัน tests แบบ watch |
| `npm run db:deploy` | apply migration ที่มีอยู่ |
| `npm run db:migrate` | สร้าง migration ใหม่ระหว่างพัฒนา |
| `npm run db:seed` | seed ข้อมูลตัวอย่าง |

## การรันเทสต์ (backend)

```powershell
Copy-Item backend/.env.test.example backend/.env.test
# แก้ไข DATABASE_URL ใน .env.test ให้ชี้ไปที่ฐานข้อมูลที่ลงท้ายด้วย _test
npm run test --prefix backend
```

- `tests/global-setup.ts` จะสร้างฐานข้อมูลทดสอบอัตโนมัติ (ถ้ายังไม่มี), run `prisma generate` และ `prisma migrate deploy`
- setup จะปฏิเสธการรันหากชื่อฐานข้อมูลไม่ลงท้ายด้วย `_test` เพื่อกันการลบข้อมูลจริง
- ทุกเทสต์จะ truncate ข้อมูลในฐานข้อมูลทดสอบก่อนเริ่ม และลบไฟล์ใน `UPLOAD_DIR` ของ test

## API หลัก

รายละเอียด endpoint, request/response และตัวอย่างการใช้งานทั้งหมดดูที่ [`docs/api.md`](docs/api.md)

| กลุ่ม | Endpoint |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET/PATCH /api/auth/me` |
| ห้อง | `/api/room-types`, `/api/rooms` (GET เป็น public ส่วนเพิ่ม/แก้/ลบต้องเป็น STAFF/ADMIN) |
| คน | `/api/tenants` (STAFF/ADMIN), `/api/staff` (GET: STAFF/ADMIN, จัดการ: ADMIN) |
| การจอง | `/api/bookings`, `POST /api/bookings/:id/confirm`, `/cancel`, `/complete` |
| สัญญา | `/api/contracts` (POST = ยืนยันการจองและออกสัญญา) |
| มิเตอร์ | `/api/utility-meters` |
| ใบแจ้งหนี้ | `/api/invoices`, `POST /api/invoices/:id/cancel`, `POST /api/invoices/:id/payments` (แนบสลิป) |
| การชำระเงิน | `/api/payments`, `POST /api/payments/:id/approve`, `/reject`, `GET /api/payments/:id/slip` |
| แจ้งซ่อม | `/api/repair-requests` |
| อื่นๆ | `GET /api/dashboard/summary`, `GET /api/settings` (STAFF/ADMIN) |

ทุก endpoint รับและส่ง field แบบ snake_case และ list คืนเป็น array (ผู้เช่าได้เฉพาะข้อมูลของตัวเอง)

## หมายเหตุ

- เอกสารนำเสนอ: เปิด `docs/presentation.html` ใน browser แล้วใช้ปุ่มลูกศรซ้าย/ขวา หรือพิมพ์เป็น PDF
- โครงร่างสไลด์และ demo script: `docs/presentation-outline.md`
- การชำระเงินเป็นการอัปโหลดสลิปและให้ STAFF/ADMIN ตรวจสอบ ไม่มีการเชื่อมต่อ payment gateway จริง
- เฉพาะรายการที่ `อนุมัติแล้ว` เท่านั้นที่ถูกนับเป็นยอดชำระ; รายการ `รอตรวจสอบ` และ `ปฏิเสธ` ไม่ถูกนับ
- ค่า `total_amount` ของใบแจ้งหนี้คำนวณจากค่าเช่า + ค่าน้ำ + ค่าไฟ + เงินมัดจำ ในชั้น service
- สถานะ `เกินกำหนด` คำนวณตอนแสดงผล (ใบที่ `ค้างชำระ` และเลยวันครบกำหนด) ไม่ได้เก็บในฐานข้อมูล
- ใบแจ้งหนี้ที่ชำระครบหรือถูกยกเลิกแล้วจะแก้ไขไม่ได้ และไม่สามารถเปลี่ยนสถานะผ่าน `PATCH` โดยตรง
- การยกเลิกการจองจะปฏิเสธรายการชำระเงินที่ `รอตรวจสอบ` ให้อัตโนมัติ แต่จะไม่ยอมให้ยกเลิกหากมีรายการที่ `อนุมัติแล้ว`
- การปิดสัญญาจะทำได้เมื่อไม่มีใบแจ้งหนี้ที่ค้างชำระ
- หนึ่งมิเตอร์ออกใบแจ้งหนี้ได้เพียงหนึ่งใบ
- การจองจะเปลี่ยนสถานะห้องเป็น `ไม่ว่าง` ทันที และคืนสถานะ `ว่าง` เมื่อยกเลิกหรือปิดสัญญา
- Prisma client ถูก generate ไปที่ `backend/generated/prisma` (ไม่ commit)
- Integration tests อยู่ที่ `backend/tests` และใช้ฐานข้อมูลแยก (`_test`)
