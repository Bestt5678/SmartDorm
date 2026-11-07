import { z } from "zod";
import { api } from "../../api/client";
import type { ResourceConfig } from "../../components/ResourcePage";
import { addYears, date, id, money, optionalId, toDateInput } from "../../lib/zodHelpers";
import { bookingLabel, roomNo, tenantName } from "../labels";

const ACTIVE = ["รอดำเนินการ", "ยืนยันแล้ว"];

export const bookingConfig: ResourceConfig = {
  title: "การจอง",
  description: "ยืนยันการจองเพื่อออกสัญญาเช่าและใบแจ้งหนี้เงินมัดจำให้อัตโนมัติ",
  endpoint: "/bookings",
  pk: "booking_id",
  rowLabel: bookingLabel,
  createLabel: "จองห้อง",
  rowSchema: z.object({
    booking_id: z.coerce.number(),
    room_id: z.coerce.number(),
    tenant_id: z.coerce.number(),
    booking_date: z.string(),
    move_in_date: z.string(),
    status: z.string(),
  }),
  // ผู้เช่าจองให้ตัวเอง (ไม่มีช่องผู้เช่า) ส่วนเจ้าหน้าที่ต้องเลือกผู้เช่า
  formSchema: z.object({
    room_id: id("เลือกห้อง"),
    tenant_id: optionalId,
    move_in_date: date,
  }),
  fields: [
    {
      name: "room_id", label: "ห้อง (เฉพาะห้องว่าง)", type: "ref",
      source: { endpoint: "/rooms", value: "room_id", label: "room_number", filter: (r) => r.status === "ว่าง" },
    },
    {
      name: "tenant_id", label: "ผู้เช่า", type: "ref", roles: ["STAFF", "ADMIN"],
      source: { endpoint: "/tenants", value: "tenant_id", label: "full_name" },
    },
    { name: "move_in_date", label: "วันที่เข้าพัก", type: "date" },
  ],
  columns: [
    { key: "booking_id", label: "#" },
    { key: "room_id", label: "ห้อง", render: roomNo },
    { key: "tenant_id", label: "ผู้เช่า", render: tenantName },
    { key: "booking_date", label: "วันที่จอง", kind: "date" },
    { key: "move_in_date", label: "วันเข้าพัก", kind: "date" },
    { key: "status", label: "สถานะ", kind: "badge" },
  ],
  actions: [
    {
      key: "confirm",
      label: "ยืนยัน + ออกสัญญา",
      roles: ["STAFF", "ADMIN"],
      when: (row) => row.status === "รอดำเนินการ",
      fields: [
        { name: "start_date", label: "วันเริ่มสัญญา", type: "date" },
        { name: "end_date", label: "วันสิ้นสุดสัญญา", type: "date" },
        { name: "deposit", label: "เงินมัดจำ (ออกใบแจ้งหนี้ให้อัตโนมัติ)", type: "number" },
      ],
      schema: z
        .object({ start_date: date, end_date: date, deposit: money("กรอกเงินมัดจำ") })
        .refine((v) => v.end_date > v.start_date, { path: ["end_date"], message: "วันสิ้นสุดต้องหลังวันเริ่มสัญญา" }),
      defaults: (row) => {
        const start = toDateInput(row.move_in_date);
        return { start_date: start, end_date: addYears(start, 1), deposit: "" };
      },
      run: (row, input) => api.post(`/bookings/${row.booking_id}/confirm`, input),
      done: "ยืนยันการจองแล้ว ระบบสร้างสัญญาและใบแจ้งหนี้เงินมัดจำให้",
    },
    {
      key: "complete",
      label: "ปิดสัญญา (ย้ายออก)",
      roles: ["STAFF", "ADMIN"],
      when: (row) => row.status === "ยืนยันแล้ว",
      confirm: "ปิดสัญญาและคืนสถานะห้องเป็นว่าง? (ต้องไม่มีใบแจ้งหนี้ค้างชำระ)",
      run: (row) => api.post(`/bookings/${row.booking_id}/complete`),
      done: "ปิดสัญญาแล้ว",
    },
    {
      key: "cancel",
      label: "ยกเลิกการจอง",
      danger: true,
      when: (row) => ACTIVE.includes(String(row.status)),
      confirm: "ยืนยันการยกเลิกการจองนี้?",
      run: (row) => api.post(`/bookings/${row.booking_id}/cancel`),
      done: "ยกเลิกการจองแล้ว",
    },
  ],
};
