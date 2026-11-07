import { z } from "zod";
import type { ResourceConfig } from "../../components/ResourcePage";
import { money } from "../../lib/zodHelpers";

export const roomTypeRowSchema = z.object({
  room_type_id: z.coerce.number(),
  type_name: z.string(),
  base_price: z.coerce.number(),
  description: z.string().nullish(),
});

/** แยกข้อความในฟอร์มเป็นรายการ (ตัดช่องว่างและค่าว่างทิ้ง) */
const splitList = (separator: RegExp) => (value: string) =>
  value.split(separator).map((item) => item.trim()).filter(Boolean);

const form = z.object({
  type_name: z.string().trim().min(1, "กรอกชื่อประเภท").max(50),
  base_price: money("กรอกราคา"),
  description: z.string().max(2000).optional(),
  // URL รูปภาพ บรรทัดละ 1 รูป (สูงสุด 8 รูป)
  image_urls: z
    .string()
    .optional()
    .transform((v) => splitList(/[\s,]+/)(v ?? ""))
    .pipe(z.array(z.url("URL รูปภาพไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)")).max(8, "ใส่รูปได้ไม่เกิน 8 รูป")),
  // สิ่งอำนวยความสะดวก คั่นด้วยจุลภาค
  amenities: z
    .string()
    .optional()
    .transform((v) => splitList(/[,\n]+/)(v ?? ""))
    .pipe(z.array(z.string().max(50, "แต่ละรายการยาวไม่เกิน 50 ตัวอักษร")).max(20, "ใส่ได้ไม่เกิน 20 รายการ")),
});

const listOf = (value: unknown) => (Array.isArray(value) ? value.length : 0);

export const roomTypeConfig: ResourceConfig = {
  title: "ประเภทห้อง",
  endpoint: "/room-types",
  pk: "room_type_id",
  rowLabel: (row) => `ประเภท ${row.type_name}`,
  rowSchema: roomTypeRowSchema,
  formSchema: form,
  edit: { fields: ["type_name", "base_price", "description", "image_urls", "amenities"], schema: form },
  fields: [
    { name: "type_name", label: "ชื่อประเภท" },
    { name: "base_price", label: "ราคาเริ่มต้น/เดือน", type: "number" },
    { name: "description", label: "รายละเอียด", type: "textarea" },
    { name: "image_urls", label: "URL รูปภาพ (บรรทัดละ 1 รูป)", type: "textarea" },
    { name: "amenities", label: "สิ่งอำนวยความสะดวก (คั่นด้วยจุลภาค เช่น แอร์, Wi-Fi)", type: "textarea" },
  ],
  columns: [
    { key: "room_type_id", label: "#" },
    { key: "type_name", label: "ประเภท" },
    { key: "base_price", label: "ราคาเริ่มต้น", kind: "money" },
    { key: "description", label: "รายละเอียด", render: (row) => String(row.description ?? "-").slice(0, 60) },
    { key: "image_urls", label: "รูป", render: (row) => `${listOf(row.image_urls)} รูป` },
    { key: "amenities", label: "สิ่งอำนวยความสะดวก", render: (row) => (Array.isArray(row.amenities) ? row.amenities.join(", ") : "-") },
  ],
};
