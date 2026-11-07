/**
 * Mock API สำหรับรัน frontend โดยไม่ต้องมี backend
 * เปิดด้วย VITE_USE_MOCK=true ใน .env — ข้อมูลอยู่ในหน่วยความจำ (รีเฟรชแล้วรีเซ็ต)
 * ชื่อ field และรูปแบบ response ตรงกับ backend จริง (snake_case, list เป็น array)
 */
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ข้อมูลจำลอง ไม่ต้องการ type ละเอียด
type Row = Record<string, any>;
type Table = { pk: string; rows: Row[]; onCreate?: (r: Row) => void };

const today = () => new Date().toISOString().slice(0, 10);
const withTotal = (r: Row) => {
  r.total_amount = Number(r.rent_amount) + Number(r.water_amount) + Number(r.electric_amount);
  r.paid_amount = r.status === "ชำระแล้ว" ? r.total_amount : 0;
  r.balance = r.total_amount - r.paid_amount;
  r.invoice_type ??= "RENT";
};

const invoices: Row[] = [
  { invoice_id: 1, contract_id: 1, meter_id: 1, invoice_date: "2026-10-31", due_date: "2026-11-05", rent_amount: 3800, water_amount: 120, electric_amount: 640, status: "ชำระแล้ว" },
  { invoice_id: 2, contract_id: 2, meter_id: 2, invoice_date: "2026-10-31", due_date: "2026-11-05", rent_amount: 2500, water_amount: 90, electric_amount: 480, status: "ค้างชำระ" },
];
invoices.forEach(withTotal);

const tables: Record<string, Table> = {
  "room-types": { pk: "room_type_id", rows: [
    { room_type_id: 1, type_name: "พัดลม", base_price: 2500, description: "ห้องพัดลม ราคาประหยัด" },
    { room_type_id: 2, type_name: "แอร์", base_price: 3800, description: "ห้องแอร์ พร้อมเฟอร์นิเจอร์" },
  ] },
  rooms: { pk: "room_id", rows: [
    { room_id: 1, room_number: "101", floor: 1, room_type_id: 1, monthly_rate: 2500, status: "ว่าง" },
    { room_id: 2, room_number: "102", floor: 1, room_type_id: 2, monthly_rate: 3800, status: "ไม่ว่าง" },
    { room_id: 3, room_number: "201", floor: 2, room_type_id: 1, monthly_rate: 2500, status: "ไม่ว่าง" },
    { room_id: 4, room_number: "202", floor: 2, room_type_id: 2, monthly_rate: 3800, status: "ว่าง" },
    { room_id: 5, room_number: "301", floor: 3, room_type_id: 2, monthly_rate: 4000, status: "ปิดปรับปรุง" },
  ] },
  tenants: { pk: "tenant_id", onCreate: (r) => { r.created_at = new Date().toISOString(); }, rows: [
    { tenant_id: 1, full_name: "เช่า หนึ่ง", id_card_no: "1234567890123", phone: "0812345678", email: "tenant1@example.com", created_at: "2026-09-01T09:00:00Z" },
    { tenant_id: 2, full_name: "เช่า สอง", id_card_no: "1234567890124", phone: "0823456789", email: null, created_at: "2026-09-15T10:30:00Z" },
    { tenant_id: 3, full_name: "เช่า สาม", id_card_no: "1234567890125", phone: null, email: "tenant3@example.com", created_at: "2026-10-02T14:00:00Z" },
  ] },
  bookings: { pk: "booking_id", onCreate: (r) => { r.booking_date = today(); }, rows: [
    { booking_id: 1, room_id: 2, tenant_id: 1, booking_date: "2026-09-01", move_in_date: "2026-09-10", status: "ยืนยันแล้ว" },
    { booking_id: 2, room_id: 3, tenant_id: 2, booking_date: "2026-09-15", move_in_date: "2026-10-01", status: "ยืนยันแล้ว" },
    { booking_id: 3, room_id: 4, tenant_id: 3, booking_date: "2026-11-01", move_in_date: "2026-12-01", status: "รอดำเนินการ" },
  ] },
  contracts: { pk: "contract_id", rows: [
    { contract_id: 1, booking_id: 1, start_date: "2026-09-10", end_date: "2027-09-09", deposit: 7600 },
    { contract_id: 2, booking_id: 2, start_date: "2026-10-01", end_date: "2027-09-30", deposit: 5000 },
  ] },
  staff: { pk: "staff_id", rows: [
    { staff_id: 1, full_name: "ช่าง หนึ่ง", position: "ช่างซ่อมบำรุง", phone: "0898765432" },
    { staff_id: 2, full_name: "ดูแลหอพัก หนึ่ง", position: "ผู้ดูแลหอพัก", phone: "0876543210" },
    { staff_id: 3, full_name: "แม่บ้าน หนึ่ง", position: "แม่บ้าน", phone: null },
  ] },
  "utility-meters": { pk: "meter_id", rows: [
    { meter_id: 1, room_id: 2, meter_month: "2026-10-01", water_unit: 6, electric_unit: 80 },
    { meter_id: 2, room_id: 3, meter_month: "2026-10-01", water_unit: 4.5, electric_unit: 60 },
  ] },
  invoices: { pk: "invoice_id", rows: invoices, onCreate: (r) => {
    r.invoice_date = today(); r.meter_id ??= null; withTotal(r);
  } },
  payments: { pk: "payment_id", onCreate: (r) => { r.payment_date = today(); r.status = "อนุมัติแล้ว"; }, rows: [
    { payment_id: 1, invoice_id: 1, payment_date: "2026-11-02", amount: 4560, payment_type: "โอนเงิน", status: "อนุมัติแล้ว", slip_url: null },
  ] },
  "repair-requests": { pk: "repair_id", onCreate: (r) => { r.request_date = today(); r.staff_id ??= null; }, rows: [
    { repair_id: 1, room_id: 2, staff_id: 1, request_date: "2026-10-20", description: "แอร์ไม่เย็น มีน้ำหยด", status: "กำลังดำเนินการ" },
    { repair_id: 2, room_id: 3, staff_id: null, request_date: "2026-11-03", description: "หลอดไฟในห้องน้ำเสีย", status: "รอดำเนินการ" },
  ] },
};

const NAMES: Record<string, string> = { TENANT: "เช่า หนึ่ง", STAFF: "ดูแลหอพัก หนึ่ง", ADMIN: "ผู้ดูแลหอพัก" };
let mockUser: Row | null = null;

export async function mockAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await new Promise((r) => setTimeout(r, 250)); // จำลองความหน่วงของเครือข่าย

  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";
  const body: Row = typeof config.data === "string" ? JSON.parse(config.data || "{}") : config.data ?? {};

  const ok = (data: unknown, status = 200): AxiosResponse => ({ data, status, statusText: "OK", headers: {}, config });
  const err = (status: number, message: string) =>
    new AxiosError(message, "ERR_BAD_REQUEST", config, null,
      { data: { message }, status, statusText: "", headers: {}, config });

  if (url === "/auth/login" && method === "post") {
    if (!body.email || !body.password) throw err(400, "กรอกอีเมลและรหัสผ่าน");
    mockUser = { id: 1, name: NAMES[body.role] ?? "ผู้ใช้", role: body.role, email: body.email };
    return ok({ token: `mock-${body.role}`, user: mockUser });
  }

  if (url === "/auth/register" && method === "post") {
    mockUser = { id: 2, name: body.full_name, role: "TENANT", email: body.email };
    return ok({ token: "mock-TENANT", user: mockUser }, 201);
  }

  if (url === "/auth/me") {
    const hit = String(config.headers?.Authorization ?? "").match(/^Bearer mock-(\w+)$/);
    if (!hit) throw err(401, "token ไม่ถูกต้อง");
    if (method === "patch" && mockUser) {
      mockUser = { ...mockUser, name: body.full_name ?? mockUser.name, phone: body.phone };
    }
    return ok(mockUser);
  }

  if (url === "/dashboard/summary") {
    const count = (rows: Row[], status: string) => rows.filter((r) => r.status === status).length;
    const rooms = tables.rooms.rows;
    return ok({
      rooms: { total: rooms.length, available: count(rooms, "ว่าง"), occupied: count(rooms, "ไม่ว่าง"), maintenance: count(rooms, "ปิดปรับปรุง") },
      tenants: tables.tenants.rows.length,
      bookings: { total: tables.bookings.rows.length, pending: count(tables.bookings.rows, "รอดำเนินการ"), confirmed: count(tables.bookings.rows, "ยืนยันแล้ว"), cancelled: 0, completed: 0 },
      repairs: { total: tables["repair-requests"].rows.length, pending: count(tables["repair-requests"].rows, "รอดำเนินการ"), in_progress: count(tables["repair-requests"].rows, "กำลังดำเนินการ"), completed: 0 },
      finance: {
        outstanding_amount: invoices.reduce((sum, i) => sum + i.balance, 0),
        paid_this_month: tables.payments.rows.reduce((sum, p) => sum + Number(p.amount), 0),
        revenue_by_month: [{ month: "2026-11-01", total: 4560 }],
      },
      recent_bookings: tables.bookings.rows, recent_invoices: invoices, recent_repairs: tables["repair-requests"].rows,
    });
  }

  const m = url.match(/^\/([^/?]+)(?:\/(\d+))?(?:\/([a-z]+))?/);
  const table = m ? tables[m[1]] : undefined;
  if (!m || !table) throw err(404, `ไม่พบ endpoint ${url}`);
  const id = m[2] ? Number(m[2]) : null;

  if (method === "get") {
    if (id === null) return ok(table.rows);
    const row = table.rows.find((r) => r[table.pk] === id);
    if (!row) throw err(404, "ไม่พบข้อมูล");
    return ok(row);
  }
  // ปุ่มต่อแถว เช่น /bookings/1/confirm (mock แค่ตอบว่าสำเร็จ)
  if (method === "post" && id !== null && m[3]) return ok({});
  if (method === "patch" && id !== null) {
    const row = table.rows.find((r) => r[table.pk] === id);
    if (!row) throw err(404, "ไม่พบข้อมูล");
    Object.assign(row, body);
    return ok(row);
  }
  if (method === "post") {
    const row: Row = { ...body, [table.pk]: Math.max(0, ...table.rows.map((r) => r[table.pk])) + 1 };
    table.onCreate?.(row);
    table.rows.push(row);
    return ok(row, 201);
  }
  if (method === "delete" && id !== null) {
    const i = table.rows.findIndex((r) => r[table.pk] === id);
    if (i < 0) throw err(404, "ไม่พบข้อมูล");
    table.rows.splice(i, 1);
    return ok({});
  }
  throw err(405, "ไม่รองรับ method นี้ใน mock");
}
