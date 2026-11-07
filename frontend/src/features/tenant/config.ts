import { z } from "zod";
import type { ResourceConfig } from "../../components/ResourcePage";
import { optionalPattern } from "../../lib/zodHelpers";

const form = z.object({
  full_name: z.string().trim().min(2, "กรอกชื่ออย่างน้อย 2 ตัวอักษร").max(100),
  id_card_no: z.string().regex(/^\d{13}$/, "เลขบัตรประชาชนต้องมี 13 หลัก"),
  phone: optionalPattern(/^\d{9,10}$/, "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก"),
  email: optionalPattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "อีเมลไม่ถูกต้อง"),
});

export const tenantConfig: ResourceConfig = {
  title: "ผู้เช่า",
  description: "เพิ่มผู้เช่าที่ติดต่อหน้าหอ (walk-in) ได้ ผู้เช่าที่สมัครออนไลน์จะมีบัญชีเข้าสู่ระบบด้วย",
  endpoint: "/tenants",
  pk: "tenant_id",
  rowLabel: (row) => String(row.full_name),
  rowSchema: z.object({
    tenant_id: z.coerce.number(),
    full_name: z.string(),
    id_card_no: z.string().nullish(),
    phone: z.string().nullish(),
    email: z.string().nullish(),
    created_at: z.string(),
  }),
  formSchema: form,
  edit: { fields: ["full_name", "id_card_no", "phone", "email"], schema: form },
  fields: [
    { name: "full_name", label: "ชื่อ-นามสกุล" },
    { name: "id_card_no", label: "เลขบัตรประชาชน" },
    { name: "phone", label: "เบอร์โทร" },
    { name: "email", label: "อีเมล", type: "email" },
  ],
  columns: [
    { key: "tenant_id", label: "#" },
    { key: "full_name", label: "ชื่อ-นามสกุล" },
    { key: "phone", label: "เบอร์โทร" },
    { key: "email", label: "อีเมล" },
    {
      key: "account",
      label: "บัญชี",
      render: (row) => ((row.account as { email?: string } | null)?.email ? "มีบัญชี" : "-"),
    },
    { key: "created_at", label: "บันทึกเมื่อ", kind: "date" },
  ],
};
