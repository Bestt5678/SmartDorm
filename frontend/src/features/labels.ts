import type { Ref, Row } from "../components/ResourcePage";

// ข้อความแสดงผลของข้อมูลที่อ้างถึงกัน (backend ส่งข้อมูลที่ join แล้วมาให้ เช่น booking.room, booking.tenant)
type Nested = Record<string, unknown> | null | undefined;
const get = (row: Row, key: string) => row[key] as Nested;

export const roomNo = (row: Row) => String(get(row, "room")?.room_number ?? row.room_id ?? "-");
export const tenantName = (row: Row) => String(get(row, "tenant")?.full_name ?? row.tenant_id ?? "-");

export const bookingLabel = (row: Row) => `#${row.booking_id} · ห้อง ${roomNo(row)} · ${tenantName(row)}`;

export const contractLabel = (row: Row) => {
  const booking = get(row, "booking") ?? {};
  return `สัญญา #${row.contract_id} · ห้อง ${roomNo(booking)} · ${tenantName(booking)}`;
};

export const invoiceLabel = (row: Row) =>
  `ใบแจ้งหนี้ #${row.invoice_id} · คงเหลือ ${Number(row.balance ?? 0).toLocaleString("th-TH")} บาท`;

export const ROOMS_REF: Ref = { endpoint: "/rooms", value: "room_id", label: "room_number" };
export const STAFF_REF: Ref = { endpoint: "/staff", value: "staff_id", label: "full_name" };

/** ผู้เช่าเลือกได้เฉพาะห้องที่ตัวเองมีสัญญาอยู่ */
export const MY_ROOMS_REF: Ref = {
  endpoint: "/contracts",
  value: (row) => get(row, "booking")?.room_id,
  label: (row) => `ห้อง ${roomNo(get(row, "booking") ?? {})}`,
  filter: (row) => get(row, "booking")?.status === "ยืนยันแล้ว",
};
