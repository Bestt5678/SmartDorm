import { mockAdapter } from "./mock";
import axios, { AxiosError } from "axios";
import { z } from "zod";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type ErrorBody = { message?: string; errors?: Array<{ path?: string; message: string }> };

export function errorMessage(e: unknown): string {
  if (e instanceof z.ZodError) return "ข้อมูลจากเซิร์ฟเวอร์ไม่ตรงกับรูปแบบที่คาดไว้";
  if (e instanceof AxiosError) {
    const body = e.response?.data as ErrorBody | undefined;
    if (body?.errors?.length) return body.errors.map((item) => item.message).join(", ");
    if (body?.message) return body.message;
    if (e.code === "ERR_NETWORK") return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า backend ทำงานอยู่";
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
}

/**
 * GET แล้วตรวจข้อมูลด้วย Zod ก่อนส่งให้ UI
 * field ที่ schema ไม่ได้ระบุ (เช่น ข้อมูลที่ join มาอย่าง room, tenant) ยังเก็บไว้ให้ใช้แสดงผลได้
 */
export async function getList<T extends z.ZodType>(url: string, schema: T): Promise<z.infer<T>[]> {
  const { data } = await api.get(url);
  const parsed = z.array(schema).parse(data);
  return parsed.map((row, i) => ({ ...(data[i] as object), ...(row as object) }) as z.infer<T>);
}

export async function post<T extends z.ZodType>(url: string, body: unknown, schema: T): Promise<z.infer<T>> {
  const { data } = await api.post(url, body);
  return schema.parse(data);
}

/** เปิดสลิปในแท็บใหม่ (ต้องแนบ token จึงดาวน์โหลดเป็น blob ก่อน) */
export async function openSlip(paymentId: number) {
  const tab = window.open("", "_blank");
  try {
    const response = await api.get(`/payments/${paymentId}/slip`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    if (tab && !tab.closed) tab.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

// token หมดอายุหรือไม่ถูกต้อง → ออกจากระบบ (ยกเว้นหน้า login เอง)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  }
);

// เปิดโหมดจำลอง API (ไม่ต้องมี backend) ด้วย VITE_USE_MOCK=true
if (import.meta.env.VITE_USE_MOCK === "true") api.defaults.adapter = mockAdapter;
