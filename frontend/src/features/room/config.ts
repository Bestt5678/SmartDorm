import { z } from "zod";
import { api } from "../../api/client";
import type { ResourceConfig } from "../../components/ResourcePage";
import { date, id, money, today } from "../../lib/zodHelpers";

export const ROOM_STATUS = ["ว่าง", "ไม่ว่าง", "ปิดปรับปรุง"] as const;

export const roomRowSchema = z.object({
  room_id: z.coerce.number(),
  room_number: z.string(),
  floor: z.coerce.number(),
  room_type_id: z.coerce.number(),
  monthly_rate: z.coerce.number(),
  status: z.string(),
});

const form = z.object({
  room_number: z.string().trim().min(1, "กรอกเลขห้อง").max(10),
  floor: z.string().min(1, "กรอกชั้น").pipe(z.coerce.number<string>().int().min(1, "ชั้นต้องเป็น 1 ขึ้นไป")),
  room_type_id: id("เลือกประเภทห้อง"),
  monthly_rate: money("กรอกค่าเช่า"),
  status: z.enum(ROOM_STATUS, { error: "เลือกสถานะ" }),
});

export const roomConfig: ResourceConfig = {
  title: "ห้องพัก",
  endpoint: "/rooms",
  pk: "room_id",
  rowLabel: (row) => `ห้อง ${row.room_number}`,
  rowSchema: roomRowSchema,
  formSchema: form,
  edit: { fields: ["room_number", "floor", "room_type_id", "monthly_rate", "status"], schema: form },
  fields: [
    { name: "room_number", label: "เลขห้อง" },
    { name: "floor", label: "ชั้น", type: "number" },
    { name: "room_type_id", label: "ประเภทห้อง", type: "ref", source: { endpoint: "/room-types", value: "room_type_id", label: "type_name" } },
    { name: "monthly_rate", label: "ค่าเช่า/เดือน", type: "number" },
    { name: "status", label: "สถานะ", type: "select", options: ROOM_STATUS },
  ],
  defaults: { status: "ว่าง" },
  columns: [
    { key: "room_number", label: "ห้อง" },
    { key: "floor", label: "ชั้น" },
    { key: "room_type_id", label: "ประเภทห้อง", ref: { endpoint: "/room-types", value: "room_type_id", label: "type_name" } },
    { key: "monthly_rate", label: "ค่าเช่า", kind: "money" },
    { key: "status", label: "สถานะ", kind: "badge" },
  ],
  actions: [
    {
      key: "book",
      label: "จองห้องนี้",
      roles: ["TENANT"],
      when: (row) => row.status === "ว่าง",
      fields: [{ name: "move_in_date", label: "วันที่ต้องการย้ายเข้า", type: "date" }],
      schema: z.object({ move_in_date: date }),
      defaults: () => ({ move_in_date: today() }),
      run: (row, input) => api.post("/bookings", { room_id: row.room_id, ...input }),
      done: "ส่งคำขอจองแล้ว รอเจ้าหน้าที่ยืนยัน (ดูได้ที่เมนู การจอง)",
    },
  ],
};
