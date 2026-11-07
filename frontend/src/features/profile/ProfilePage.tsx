import { useState } from "react";
import { z } from "zod";
import { api, errorMessage } from "../../api/client";
import { Button, Field, inputCls } from "../../components/ui";
import { useAuth } from "../auth/AuthContext";

const ProfileSchema = z.object({
  full_name: z.string().trim().min(2, "กรอกชื่ออย่างน้อย 2 ตัวอักษร").max(100),
  id_card_no: z.string().refine((v) => v === "" || /^\d{13}$/.test(v), "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก"),
  phone: z.string().trim().refine((v) => v === "" || /^\d{9,10}$/.test(v), "เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก"),
});

/** ข้อมูลส่วนตัวของผู้เช่า (ผู้ที่สมัครผ่าน Google/LINE/Facebook ต้องกรอกเลขบัตรก่อนจองห้อง) */
export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ full_name: user?.name ?? "", id_card_no: "", phone: user?.phone ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const parsed = ProfileSchema.safeParse(form);
    if (!parsed.success) {
      const f = z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>;
      return setErrors(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0] ?? ""])));
    }
    if (!user?.profile_complete && !parsed.data.id_card_no) {
      return setErrors({ id_card_no: "กรอกเลขบัตรประชาชนเพื่อใช้จองห้อง" });
    }
    setErrors({});
    setSaving(true);
    try {
      const body = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== ""));
      await api.patch("/auth/me", body);
      await refresh();
      setForm((f) => ({ ...f, id_card_no: "" }));
      setMsg({ text: "บันทึกข้อมูลแล้ว" });
    } catch (err) {
      setMsg({ text: errorMessage(err), error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="max-w-lg">
      <h2 className="text-lg font-semibold">ข้อมูลส่วนตัว</h2>
      <p className="mb-4 text-sm text-slate-500">อีเมล: {user?.email ?? "ไม่มี (เข้าสู่ระบบผ่านบัญชีโซเชียล)"}</p>

      {!user?.profile_complete && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          กรุณากรอกเลขบัตรประชาชนก่อนจองห้องพัก (ใช้สำหรับทำสัญญาเช่า)
        </p>
      )}

      <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <Field label="ชื่อ-นามสกุล" error={errors.full_name}>
          <input className={inputCls} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field
          label={user?.profile_complete ? "เลขบัตรประชาชน (กรอกเฉพาะเมื่อต้องการแก้ไข)" : "เลขบัตรประชาชน"}
          error={errors.id_card_no}
        >
          <input className={inputCls} inputMode="numeric" value={form.id_card_no}
            onChange={(e) => setForm({ ...form, id_card_no: e.target.value })} />
        </Field>
        <Field label="เบอร์โทร" error={errors.phone}>
          <input className={inputCls} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        {msg && (
          <p role={msg.error ? "alert" : "status"}
            className={`rounded-lg p-3 text-sm ${msg.error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
            {msg.text}
          </p>
        )}
        <Button disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
      </form>
    </section>
  );
}
