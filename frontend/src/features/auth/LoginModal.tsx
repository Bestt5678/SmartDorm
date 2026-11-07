import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { errorMessage } from "../../api/client";
import { Button, Field, inputCls } from "../../components/ui";
import { useAuth } from "./AuthContext";
import { LoginFormSchema, RegisterFormSchema, ROLE_LABEL, type Role } from "./schema";

const roles: Role[] = ["TENANT", "STAFF", "ADMIN"];
const hint: Record<Role, string> = {
  TENANT: "ดูใบแจ้งหนี้ จองห้อง และแจ้งซ่อมห้องของคุณ",
  STAFF: "จัดการการจอง ใบแจ้งหนี้ และงานซ่อม",
  ADMIN: "ดูแลระบบและเจ้าหน้าที่ทั้งหมด",
};

const blankRegister = { full_name: "", id_card_no: "", phone: "", email: "", password: "", confirm_password: "" };

function fieldErrors(error: z.ZodError) {
  const f = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0] ?? ""]));
}

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<Role>("TENANT");
  const [form, setForm] = useState({ email: "", password: "" });
  const [reg, setReg] = useState(blankRegister);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function switchMode(next: "login" | "register") {
    setMode(next);
    setErrors({});
    setServerError(null);
  }

  async function run(action: () => Promise<void>) {
    setLoading(true);
    setServerError(null);
    try {
      await action();
      onClose();
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    const parsed = LoginFormSchema.safeParse({ ...form, role });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    void run(() => login(parsed.data));
  }

  function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    const parsed = RegisterFormSchema.safeParse(reg);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    void run(() => register(parsed.data));
  }

  const regInput = (name: keyof typeof blankRegister, type = "text", autoComplete?: string) => (
    <input
      type={type} autoComplete={autoComplete} className={inputCls} value={reg[name]}
      onChange={(e) => setReg({ ...reg, [name]: e.target.value })}
    />
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        role="dialog" aria-modal="true" aria-label={mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
        onSubmit={mode === "login" ? submitLogin : submitRegister}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิกผู้เช่า"}</h2>
            <p className="text-sm text-slate-500">
              {mode === "login" ? hint[role] : "สร้างบัญชีเพื่อจองห้องและดูใบแจ้งหนี้ออนไลน์"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด"
            className="rounded-lg px-2 text-xl leading-none text-slate-400 hover:bg-slate-100">×</button>
        </div>

        {mode === "login" ? (
          <>
            <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              {roles.map((r) => (
                <button
                  key={r} type="button" role="tab" aria-selected={role === r}
                  onClick={() => { setRole(r); setServerError(null); }}
                  className={`rounded-lg py-1.5 text-sm font-medium ${
                    role === r ? "bg-white text-accent shadow-sm" : "text-slate-600"}`}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>

            <Field label="อีเมล" error={errors.email}>
              <input ref={emailRef} type="email" autoComplete="username" className={inputCls}
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="รหัสผ่าน" error={errors.password}>
              <input type="password" autoComplete="current-password" className={inputCls}
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
          </>
        ) : (
          <>
            <Field label="ชื่อ-นามสกุล" error={errors.full_name}>{regInput("full_name", "text", "name")}</Field>
            <Field label="เลขบัตรประชาชน" error={errors.id_card_no}>{regInput("id_card_no")}</Field>
            <Field label="เบอร์โทร (ไม่บังคับ)" error={errors.phone}>{regInput("phone", "tel", "tel")}</Field>
            <Field label="อีเมล" error={errors.email}>{regInput("email", "email", "email")}</Field>
            <Field label="รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)" error={errors.password}>
              {regInput("password", "password", "new-password")}
            </Field>
            <Field label="ยืนยันรหัสผ่าน" error={errors.confirm_password}>
              {regInput("confirm_password", "password", "new-password")}
            </Field>
          </>
        )}

        {serverError && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{serverError}</p>
        )}
        <Button disabled={loading} className="w-full">
          {loading
            ? "กำลังดำเนินการ…"
            : mode === "login" ? `เข้าสู่ระบบในฐานะ${ROLE_LABEL[role]}` : "สมัครสมาชิก"}
        </Button>

        {(mode === "register" || role === "TENANT") && (
          <p className="text-center text-sm text-slate-600">
            {mode === "login" ? "ยังไม่มีบัญชี? " : "มีบัญชีแล้ว? "}
            <button type="button" className="font-medium text-accent underline"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
            </button>
          </p>
        )}
        {mode === "login" && role !== "TENANT" && (
          <p className="text-center text-xs text-slate-500">พนักงานและผู้ดูแลเข้าสู่ระบบด้วยอีเมลเท่านั้น</p>
        )}
      </form>
    </div>
  );
}
