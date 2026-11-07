import { z } from "zod";

export const RoleSchema = z.enum(["TENANT", "STAFF", "ADMIN"]);
export type Role = z.infer<typeof RoleSchema>;

export const ROLE_LABEL: Record<Role, string> = {
  TENANT: "ผู้เช่า",
  STAFF: "พนักงาน",
  ADMIN: "ผู้ดูแล",
};

export const LoginFormSchema = z.object({
  role: RoleSchema,
  email: z.string().trim().min(1, "กรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านอย่างน้อย 6 ตัวอักษร"),
});

export const RegisterFormSchema = z
  .object({
    full_name: z.string().trim().min(2, "กรอกชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษร").max(100),
    id_card_no: z.string().regex(/^\d{13}$/, "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก"),
    phone: z.string().trim().refine((v) => v === "" || /^\d{9,10}$/.test(v), "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก"),
    email: z.string().trim().min(1, "กรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
    password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร"),
    confirm_password: z.string().min(1, "ยืนยันรหัสผ่าน"),
  })
  .refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    message: "รหัสผ่านไม่ตรงกัน",
  });

export const UserSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  role: RoleSchema,
  email: z.string(),
  phone: z.string().nullish(),
});

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});

export type LoginForm = z.infer<typeof LoginFormSchema>;
export type RegisterForm = z.infer<typeof RegisterFormSchema>;
export type User = z.infer<typeof UserSchema>;
