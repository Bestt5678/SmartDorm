import { z } from "zod";
import type { ResourceConfig } from "../../components/ResourcePage";
import { optionalPattern } from "../../lib/zodHelpers";

const phone = optionalPattern(/^\d{9,10}$/, "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก");

export const staffConfig: ResourceConfig = {
  title: "พนักงาน",
  description: "ใส่อีเมลและรหัสผ่านเพื่อสร้างบัญชีให้พนักงานเข้าสู่ระบบได้ (เว้นว่างได้ถ้าไม่ต้องใช้ระบบ)",
  endpoint: "/staff",
  pk: "staff_id",
  rowLabel: (row) => String(row.full_name),
  rowSchema: z.object({
    staff_id: z.coerce.number(),
    full_name: z.string(),
    position: z.string(),
    phone: z.string().nullish(),
  }),
  formSchema: z
    .object({
      full_name: z.string().trim().min(2, "กรอกชื่ออย่างน้อย 2 ตัวอักษร").max(100),
      position: z.string().trim().min(1, "กรอกตำแหน่ง").max(50),
      phone,
      email: optionalPattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "อีเมลไม่ถูกต้อง"),
      password: z.string().refine((v) => v === "" || v.length >= 8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร").optional(),
    })
    .refine((v) => Boolean(v.email) === Boolean(v.password), {
      path: ["password"],
      message: "กรอกทั้งอีเมลและรหัสผ่าน หรือเว้นว่างทั้งคู่",
    }),
  edit: {
    fields: ["full_name", "position", "phone"],
    schema: z.object({
      full_name: z.string().trim().min(2, "กรอกชื่ออย่างน้อย 2 ตัวอักษร").max(100),
      position: z.string().trim().min(1, "กรอกตำแหน่ง").max(50),
      phone,
    }),
  },
  fields: [
    { name: "full_name", label: "ชื่อ-นามสกุล" },
    { name: "position", label: "ตำแหน่ง" },
    { name: "phone", label: "เบอร์โทร" },
    { name: "email", label: "อีเมลสำหรับเข้าสู่ระบบ (ไม่บังคับ)", type: "email" },
    { name: "password", label: "รหัสผ่าน (ไม่บังคับ)", type: "password" },
  ],
  columns: [
    { key: "staff_id", label: "#" },
    { key: "full_name", label: "ชื่อ-นามสกุล" },
    { key: "position", label: "ตำแหน่ง" },
    { key: "phone", label: "เบอร์โทร" },
    {
      key: "account",
      label: "อีเมลเข้าสู่ระบบ",
      render: (row) => (row.account as { email?: string } | null)?.email ?? "-",
    },
  ],
};
