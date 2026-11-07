import { z } from "zod";
import type { ResourceConfig } from "../../components/ResourcePage";
import { id, optionalId } from "../../lib/zodHelpers";
import { MY_ROOMS_REF, ROOMS_REF, STAFF_REF, roomNo } from "../labels";

export const REPAIR_STATUS = ["รอดำเนินการ", "กำลังดำเนินการ", "เสร็จสิ้น", "ยกเลิก"] as const;

const optionalStatus = z.preprocess((v) => (v === "" ? undefined : v), z.enum(REPAIR_STATUS).optional());

export const repairRequestConfig: ResourceConfig = {
  title: "แจ้งซ่อม",
  endpoint: "/repair-requests",
  pk: "repair_id",
  rowLabel: (row) => `แจ้งซ่อม #${row.repair_id} (ห้อง ${roomNo(row)})`,
  createLabel: "แจ้งซ่อม",
  rowSchema: z.object({
    repair_id: z.coerce.number(),
    room_id: z.coerce.number(),
    staff_id: z.coerce.number().nullish(),
    request_date: z.string(),
    description: z.string(),
    status: z.string(),
  }),
  formSchema: z.object({
    room_id: id("เลือกห้อง"),
    staff_id: optionalId,
    description: z.string().trim().min(5, "อธิบายปัญหาอย่างน้อย 5 ตัวอักษร").max(2000),
    status: optionalStatus,
  }),
  edit: {
    fields: ["staff_id", "status"],
    schema: z.object({ staff_id: optionalId, status: optionalStatus }),
  },
  fields: [
    // ผู้เช่าเลือกได้เฉพาะห้องที่ตัวเองเช่าอยู่
    { name: "room_id", label: "ห้อง", type: "ref", source: ROOMS_REF, sourceFor: { TENANT: MY_ROOMS_REF } },
    { name: "description", label: "ปัญหาที่พบ", type: "textarea" },
    // ผู้เช่าไม่ต้องเลือกผู้รับผิดชอบหรือสถานะ
    { name: "staff_id", label: "ผู้รับผิดชอบ", type: "ref", roles: ["STAFF", "ADMIN"], source: STAFF_REF },
    { name: "status", label: "สถานะ", type: "select", options: REPAIR_STATUS, roles: ["STAFF", "ADMIN"] },
  ],
  columns: [
    { key: "repair_id", label: "#" },
    { key: "room_id", label: "ห้อง", render: roomNo },
    { key: "request_date", label: "วันที่แจ้ง", kind: "date" },
    { key: "description", label: "รายละเอียด" },
    {
      key: "staff_id",
      label: "ผู้รับผิดชอบ",
      render: (row) => String((row.staff as { full_name?: string } | null)?.full_name ?? "-"),
    },
    { key: "status", label: "สถานะ", kind: "badge" },
  ],
};
