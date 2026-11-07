import { z } from "zod";

// ค่าในฟอร์มเป็น string เสมอ จึงตรวจ string ก่อนแล้วค่อยแปลงเป็นตัวเลข
export const id = (msg = "เลือกรายการ") =>
  z.string().min(1, msg).pipe(z.coerce.number<string>().int().positive(msg));

export const optionalId = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().int().positive().optional()
);

export const money = (msg = "กรอกจำนวน") =>
  z.string().trim().min(1, msg).pipe(z.coerce.number<string>({ error: msg }).min(0, "ห้ามติดลบ"));

export const date = z.string().min(1, "เลือกวันที่");

export const optionalPattern = (re: RegExp, msg: string) =>
  z.string().trim().refine((v) => v === "" || re.test(v), msg).optional();

/** แปลงวันที่จาก API (ISO) เป็น YYYY-MM-DD สำหรับ input type="date" */
export const toDateInput = (value: unknown) => (value ? String(value).slice(0, 10) : "");

/** วันที่ + จำนวนปี ในรูปแบบ YYYY-MM-DD (ใช้ตั้งค่าเริ่มต้นวันสิ้นสุดสัญญา) */
export function addYears(value: string, years: number) {
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCFullYear(d.getUTCFullYear() + years);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** วันนี้ตามเวลาเครื่องผู้ใช้ (ไม่ใช้ toISOString ตรงๆ เพราะเป็นเวลา UTC ซึ่งช่วง 00:00–07:00 ของไทยจะได้วันของเมื่อวาน) */
export const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
