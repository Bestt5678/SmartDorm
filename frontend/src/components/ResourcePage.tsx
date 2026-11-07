import { useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { api, errorMessage, getList } from "../api/client";
import { useList } from "../hooks/useList";
import { useAuth } from "../features/auth/AuthContext";
import type { Role } from "../features/auth/schema";
import { toDateInput } from "../lib/zodHelpers";
import { money } from "../lib/format";
import { Badge, Button, Field, State, inputCls } from "./ui";

export type Mode = "read" | "create" | "full"; // ดูอย่างเดียว / ดู+เพิ่ม / ดู+เพิ่ม+แก้ไข+ลบ

export type Row = Record<string, unknown>;
type FormValue = string | File;
type FormState = Record<string, FormValue>;

/** อ้างอิงตารางอื่น (FK): value/label เป็นชื่อ field หรือฟังก์ชันก็ได้ */
export type Ref = {
  endpoint: string;
  value: string | ((row: Row) => unknown);
  label: string | ((row: Row) => string);
  filter?: (row: Row) => boolean;
};

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "ref" | "file" | "password" | "email";
  options?: readonly (string | { value: string; label: string })[];
  source?: Ref; // ใช้กับ type "ref"
  sourceFor?: Partial<Record<Role, Ref>>; // แหล่งข้อมูลเฉพาะบทบาท (เช่น ผู้เช่าเลือกได้เฉพาะห้องของตัวเอง)
  roles?: Role[]; // ถ้าระบุ จะแสดงเฉพาะบทบาทเหล่านี้
  accept?: string; // ใช้กับ type "file"
};

export type Column = {
  key: string;
  label: string;
  kind?: "date" | "money" | "badge";
  ref?: Ref; // แปลง id (FK) เป็นข้อความ
  render?: (row: Row) => ReactNode;
};

/** ปุ่มต่อแถว เช่น ยืนยันการจอง อนุมัติสลิป (ถ้ามี fields จะเปิดฟอร์มให้กรอกก่อน) */
export type RowAction = {
  key: string;
  label: string;
  roles?: Role[];
  when?: (row: Row) => boolean;
  danger?: boolean;
  confirm?: string;
  fields?: FieldDef[];
  schema?: z.ZodType;
  defaults?: (row: Row) => Record<string, string>;
  run: (row: Row, input: Record<string, unknown>) => Promise<unknown>;
  done?: string;
};

export type ResourceConfig = {
  title: string;
  description?: string;
  endpoint: string;
  pk: string;
  rowSchema: z.ZodType;
  formSchema: z.ZodType;
  fields: FieldDef[];
  columns: Column[];
  defaults?: Record<string, string>;
  createLabel?: string;
  edit?: { fields: string[]; schema: z.ZodType };
  actions?: RowAction[];
  /** ข้อความเรียกแต่ละแถวบนหัวฟอร์ม เช่น "ห้อง 205" (ค่าเริ่มต้น "รายการ #id") */
  rowLabel?: (row: Row) => string;
};

const AnyRow = z.record(z.string(), z.unknown());

const pick = (row: Row, sel: Ref["value"] | Ref["label"]) => (typeof sel === "function" ? sel(row) : row[sel]);

function fieldErrors(error: z.ZodError) {
  const f = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  const formErrors = z.flattenError(error).formErrors;
  return {
    ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v?.[0] ?? ""])),
    ...(formErrors.length ? { _form: formErrors[0] } : {}),
  };
}

/** ตัดค่าว่างทิ้ง ถ้ามีไฟล์แนบจะส่งเป็น multipart/form-data */
function toPayload(data: Record<string, unknown>): Record<string, unknown> | FormData {
  const entries = Object.entries(data).filter(([, v]) => v !== "" && v !== undefined && v !== null);
  if (!entries.some(([, v]) => v instanceof File)) return Object.fromEntries(entries);
  const form = new FormData();
  for (const [k, v] of entries) form.append(k, v instanceof File ? v : String(v));
  return form;
}

function RefSelect({ source, value, onChange }: { source: Ref; value: string; onChange: (v: string) => void }) {
  const { data } = useList(source.endpoint, AnyRow);
  const rows = source.filter ? data.filter(source.filter) : data;
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">เลือก…</option>
      {rows.map((r) => {
        const v = String(pick(r, source.value));
        return <option key={v} value={v}>{String(pick(r, source.label))}</option>;
      })}
    </select>
  );
}

function FormFields({ fields, values, errors, onChange, role }: {
  fields: FieldDef[];
  values: FormState;
  errors: Record<string, string>;
  onChange: (name: string, v: FormValue) => void;
  role: Role | undefined;
}) {
  const input = (f: FieldDef) => {
    const v = values[f.name];
    const text = typeof v === "string" ? v : "";
    const source = (role && f.sourceFor?.[role]) ?? f.source;
    if (f.type === "ref" && source) return <RefSelect source={source} value={text} onChange={(x) => onChange(f.name, x)} />;
    if (f.type === "select")
      return (
        <select className={inputCls} value={text} onChange={(e) => onChange(f.name, e.target.value)}>
          <option value="">เลือก…</option>
          {f.options?.map((o) => {
            const opt = typeof o === "string" ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
      );
    if (f.type === "textarea")
      return <textarea rows={3} className={inputCls} value={text} onChange={(e) => onChange(f.name, e.target.value)} />;
    if (f.type === "file")
      return (
        <input type="file" accept={f.accept} className={inputCls}
          onChange={(e) => onChange(f.name, e.target.files?.[0] ?? "")} />
      );
    return (
      <input
        className={inputCls} value={text} onChange={(e) => onChange(f.name, e.target.value)}
        type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "password" ? "password" : f.type === "email" ? "email" : "text"}
        step={f.type === "number" ? "any" : undefined}
        autoComplete={f.type === "password" ? "new-password" : undefined}
      />
    );
  };

  return (
    <>
      {fields.map((f) => (
        <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
          <Field label={f.label} error={errors[f.name]}>{input(f)}</Field>
        </div>
      ))}
      {errors._form && <p className="text-sm text-red-700 sm:col-span-2">{errors._form}</p>}
    </>
  );
}

/** โหลดตารางที่ FK อ้างถึง แล้วทำ map: id → ข้อความ (เช่น room_type_id 2 → "แอร์") */
function useRefLabels(columns: Column[]) {
  const [maps, setMaps] = useState<Record<string, Record<string, string>>>({});
  useEffect(() => {
    columns.forEach(async (c) => {
      const ref = c.ref;
      if (!ref) return;
      try {
        const rows = await getList(ref.endpoint, AnyRow);
        setMaps((m) => ({
          ...m,
          [c.key]: Object.fromEntries(rows.map((r) => [String(pick(r, ref.value)), String(pick(r, ref.label))])),
        }));
      } catch {
        /* ดึงไม่ได้ (เช่น ไม่มีสิทธิ์) ก็แสดงเป็นเลข id ตามเดิม */
      }
    });
  }, [columns]);
  return maps;
}

function cell(row: Row, c: Column, labels: Record<string, Record<string, string>>): ReactNode {
  if (c.render) return c.render(row);
  const v = row[c.key];
  if (v == null || v === "") return "-";
  if (c.ref) return labels[c.key]?.[String(v)] ?? String(v);
  if (c.kind === "badge") return <Badge value={String(v)} />;
  if (c.kind === "date") return String(v).slice(0, 10);
  if (c.kind === "money") return money(v);
  return String(v);
}

/** แปลงค่าจากแถวเป็นค่าเริ่มต้นของฟอร์มแก้ไข */
function rowToForm(row: Row, fields: FieldDef[]): FormState {
  return Object.fromEntries(
    fields.map((f) => {
      const v = row[f.name];
      if (v == null) return [f.name, ""];
      if (f.type === "date") return [f.name, toDateInput(v)];
      if (Array.isArray(v)) return [f.name, v.join(f.name === "image_urls" ? "\n" : ", ")];
      return [f.name, String(v)];
    })
  );
}

export default function ResourcePage({ config, mode }: { config: ResourceConfig; mode: Mode }) {
  const { user } = useAuth();
  const role = user?.role;
  const labels = useRefLabels(config.columns);
  const { data, loading, error, reload } = useList(config.endpoint, config.rowSchema);
  const rows = data as Row[];

  const visibleFields = config.fields.filter((f) => !f.roles || (role && f.roles.includes(role)));
  const blank = (): FormState => ({
    ...Object.fromEntries(visibleFields.map((f) => [f.name, ""])),
    ...config.defaults,
  });

  // ฟอร์มหลัก: เพิ่ม (editing = null) หรือแก้ไข (editing = แถวที่เลือก)
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  // ฟอร์มของปุ่มต่อแถว
  const [active, setActive] = useState<{ action: RowAction; row: Row } | null>(null);
  const [actionForm, setActionForm] = useState<FormState>({});
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  // ปุ่มอยู่ในแถวที่อาจอยู่ล่างสุดของตาราง ส่วนฟอร์มอยู่เหนือตาราง จึงต้องเลื่อนให้เห็นฟอร์มทุกครั้งที่เปิด
  const formRef = useRef<HTMLFormElement>(null);
  const actionRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const target = active ? actionRef.current : editing ? formRef.current : null;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    target?.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
  }, [active, editing]);

  const label = (row: Row) => config.rowLabel?.(row) ?? `รายการ #${String(row[config.pk])}`;

  const formFields = editing && config.edit
    ? visibleFields.filter((f) => config.edit!.fields.includes(f.name))
    : visibleFields;
  const canEdit = mode === "full" && Boolean(config.edit);
  const actionsFor = (row: Row) =>
    (config.actions ?? []).filter((a) => (!a.roles || (role && a.roles.includes(role))) && (!a.when || a.when(row)));
  const hasActions = rows.some((r) => actionsFor(r).length > 0);

  function closeForm() {
    setOpen(false);
    setEditing(null);
    setErrors({});
    setForm(blank());
  }

  function startEdit(row: Row) {
    setActive(null);
    setEditing(row);
    setForm(rowToForm(row, visibleFields.filter((f) => config.edit?.fields.includes(f.name))));
    setErrors({});
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const schema = editing && config.edit ? config.edit.schema : config.formSchema;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setSaving(true);
    try {
      const payload = toPayload(parsed.data as Row);
      if (editing) await api.patch(`${config.endpoint}/${editing[config.pk]}`, payload);
      else await api.post(config.endpoint, payload);
      closeForm();
      setMsg({ text: editing ? "บันทึกการแก้ไขแล้ว" : "บันทึกแล้ว" });
      reload();
    } catch (err) {
      setMsg({ text: errorMessage(err), error: true });
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    if (!confirm("ลบรายการนี้?")) return;
    setMsg(null);
    try {
      await api.delete(`${config.endpoint}/${row[config.pk]}`);
      setMsg({ text: "ลบแล้ว" });
      reload();
    } catch (err) {
      setMsg({ text: errorMessage(err), error: true }); // เช่น ลบไม่ได้เพราะมีตารางอื่นอ้างอิงอยู่ (FK)
    }
  }

  async function runAction(action: RowAction, row: Row, input: Record<string, unknown>) {
    setMsg(null);
    try {
      await action.run(row, input);
      setActive(null);
      setMsg({ text: action.done ?? `${action.label}แล้ว` });
      reload();
    } catch (err) {
      setMsg({ text: errorMessage(err), error: true });
    }
  }

  function startAction(action: RowAction, row: Row) {
    if (action.fields?.length) {
      closeForm();
      setActive({ action, row });
      setActionForm({
        ...Object.fromEntries(action.fields.map((f) => [f.name, ""])),
        ...action.defaults?.(row),
      });
      setActionErrors({});
      return;
    }
    if (action.confirm && !confirm(action.confirm)) return;
    void runAction(action, row, {});
  }

  async function submitAction(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    const { action, row } = active;
    let input: Record<string, unknown> = actionForm;
    if (action.schema) {
      const parsed = action.schema.safeParse(actionForm);
      if (!parsed.success) return setActionErrors(fieldErrors(parsed.error));
      input = parsed.data as Record<string, unknown>;
    }
    setActionErrors({});
    setSaving(true);
    await runAction(action, row, toPayload(input) as Record<string, unknown>);
    setSaving(false);
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{config.title}</h2>
          {config.description && <p className="text-sm text-slate-500">{config.description}</p>}
        </div>
        {mode !== "read" && (
          <Button type="button" onClick={() => (open ? closeForm() : (setActive(null), setOpen(true)))}>
            {open ? "ปิดฟอร์ม" : `+ ${config.createLabel ?? "เพิ่มข้อมูล"}`}
          </Button>
        )}
      </div>

      {open && (
        <form ref={formRef} onSubmit={submit} className="mb-6 grid scroll-mt-32 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <h3 className="font-semibold sm:col-span-2">
            {editing ? `แก้ไข${label(editing)}` : config.createLabel ?? "เพิ่มข้อมูล"}
          </h3>
          <FormFields fields={formFields} values={form} errors={errors} role={role}
            onChange={(name, v) => setForm((prev) => ({ ...prev, [name]: v }))} />
          <div className="flex gap-2 sm:col-span-2">
            <Button disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
            <button type="button" onClick={closeForm} className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100">ยกเลิก</button>
          </div>
        </form>
      )}

      {active && (
        <form ref={actionRef} onSubmit={submitAction} className="mb-6 grid scroll-mt-32 gap-3 rounded-xl border border-accent/40 bg-white p-4 sm:grid-cols-2">
          <h3 className="font-semibold sm:col-span-2">
            {active.action.label} · {label(active.row)}
          </h3>
          <FormFields fields={active.action.fields ?? []} values={actionForm} errors={actionErrors} role={role}
            onChange={(name, v) => setActionForm((prev) => ({ ...prev, [name]: v }))} />
          <div className="flex gap-2 sm:col-span-2">
            <Button disabled={saving}>{saving ? "กำลังดำเนินการ…" : "ยืนยัน"}</Button>
            <button type="button" onClick={() => setActive(null)} className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100">ยกเลิก</button>
          </div>
        </form>
      )}

      {msg && (
        <p role={msg.error ? "alert" : "status"}
          className={`mb-3 rounded-lg p-3 text-sm ${msg.error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
          {msg.text}
        </p>
      )}

      <State loading={loading} error={error} empty={!rows.length} onRetry={reload} />
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                {config.columns.map((c) => <th key={c.key} className="whitespace-nowrap p-3">{c.label}</th>)}
                {(hasActions || canEdit || mode === "full") && <th className="p-3" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row[config.pk])} className="border-t border-slate-100 align-top">
                  {config.columns.map((c) => <td key={c.key} className="whitespace-nowrap p-3">{cell(row, c, labels)}</td>)}
                  {(hasActions || canEdit || mode === "full") && (
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 whitespace-nowrap">
                        {actionsFor(row).map((a) => (
                          <button key={a.key} onClick={() => startAction(a, row)}
                            className={`font-medium hover:underline ${a.danger ? "text-red-700" : "text-accent"}`}>
                            {a.label}
                          </button>
                        ))}
                        {canEdit && (
                          <button onClick={() => startEdit(row)} className="text-slate-600 hover:underline">แก้ไข</button>
                        )}
                        {mode === "full" && (
                          <button onClick={() => remove(row)} className="text-red-700 hover:underline">ลบ</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
