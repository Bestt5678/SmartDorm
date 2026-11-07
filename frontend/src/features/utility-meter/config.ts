import { z } from "zod";
import type { ResourceConfig } from "../../components/ResourcePage";
import { date, id, money } from "../../lib/zodHelpers";
import { ROOMS_REF, roomNo } from "../labels";

const form = z.object({
  room_id: id("เลือกห้อง"),
  meter_month: date, // DB เก็บเป็นวันที่ 1 ของเดือน
  water_unit: money("กรอกหน่วยน้ำ"),
  electric_unit: money("กรอกหน่วยไฟ"),
});

export const utilityMeterConfig: ResourceConfig = {
  title: "มิเตอร์น้ำ-ไฟ",
  description: "จดหน่วยที่ใช้ในแต่ละเดือน แล้วเลือกมิเตอร์ตอนออกใบแจ้งหนี้ ระบบจะคำนวณค่าน้ำค่าไฟให้",
  endpoint: "/utility-meters",
  pk: "meter_id",
  rowLabel: (row) => `มิเตอร์ห้อง ${roomNo(row)} เดือน ${String(row.meter_month).slice(0, 7)}`,
  rowSchema: z.object({
    meter_id: z.coerce.number(),
    room_id: z.coerce.number(),
    meter_month: z.string(),
    water_unit: z.coerce.number(),
    electric_unit: z.coerce.number(),
  }),
  formSchema: form,
  edit: { fields: ["room_id", "meter_month", "water_unit", "electric_unit"], schema: form },
  fields: [
    { name: "room_id", label: "ห้อง", type: "ref", source: ROOMS_REF },
    { name: "meter_month", label: "เดือนที่จด (วันที่ 1)", type: "date" },
    { name: "water_unit", label: "หน่วยน้ำ", type: "number" },
    { name: "electric_unit", label: "หน่วยไฟ", type: "number" },
  ],
  columns: [
    { key: "meter_id", label: "#" },
    { key: "room_id", label: "ห้อง", render: roomNo },
    { key: "meter_month", label: "เดือน", render: (row) => String(row.meter_month).slice(0, 7) },
    { key: "water_unit", label: "น้ำ (หน่วย)" },
    { key: "electric_unit", label: "ไฟ (หน่วย)" },
  ],
};
