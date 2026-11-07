import { z } from "zod";
import { api, openSlip } from "../../api/client";
import type { ResourceConfig, Row } from "../../components/ResourcePage";
import { id } from "../../lib/zodHelpers";
import { invoiceLabel, roomNo } from "../labels";

export const PAYMENT_TYPES = ["เงินสด", "โอนเงิน", "บัตรเครดิต", "พร้อมเพย์"] as const;

const invoiceRoom = (row: Row) => {
  const invoice = (row.invoice ?? {}) as Row;
  return roomNo((((invoice.contract ?? {}) as Row).booking ?? {}) as Row);
};

export const paymentConfig: ResourceConfig = {
  title: "การชำระเงิน",
  description: "ผู้เช่าแนบสลิปจากเมนูใบแจ้งหนี้ เจ้าหน้าที่ตรวจแล้วอนุมัติ/ปฏิเสธ หรือบันทึกรับเงินสดได้ที่นี่",
  endpoint: "/payments",
  pk: "payment_id",
  rowLabel: (row) => `การชำระ #${row.payment_id} (ห้อง ${invoiceRoom(row)})`,
  createLabel: "บันทึกรับเงิน",
  rowSchema: z.object({
    payment_id: z.coerce.number(),
    invoice_id: z.coerce.number(),
    payment_date: z.string(),
    amount: z.coerce.number(),
    payment_type: z.string(),
    status: z.string(),
    slip_url: z.string().nullish(),
    note: z.string().nullish(),
  }),
  formSchema: z.object({
    invoice_id: id("เลือกใบแจ้งหนี้"),
    // ตรงกับ CHECK (amount > 0) ใน DB
    amount: z.string().min(1, "กรอกจำนวนเงิน").pipe(z.coerce.number<string>().positive("ยอดต้องมากกว่า 0")),
    payment_type: z.enum(PAYMENT_TYPES, { error: "เลือกช่องทางชำระ" }),
  }),
  fields: [
    {
      name: "invoice_id", label: "ใบแจ้งหนี้ (ที่ยังชำระไม่ครบ)", type: "ref",
      source: {
        endpoint: "/invoices", value: "invoice_id", label: invoiceLabel,
        filter: (r) => !["ชำระแล้ว", "ยกเลิก"].includes(String(r.status)),
      },
    },
    { name: "amount", label: "จำนวนเงิน", type: "number" },
    { name: "payment_type", label: "ช่องทางชำระ", type: "select", options: PAYMENT_TYPES },
  ],
  defaults: { payment_type: "เงินสด" },
  columns: [
    { key: "payment_id", label: "#" },
    { key: "invoice_id", label: "ใบแจ้งหนี้" },
    { key: "room", label: "ห้อง", render: invoiceRoom },
    { key: "payment_date", label: "วันที่ชำระ", kind: "date" },
    { key: "amount", label: "จำนวนเงิน", kind: "money" },
    { key: "payment_type", label: "ช่องทาง" },
    { key: "status", label: "สถานะ", kind: "badge" },
    { key: "note", label: "หมายเหตุ" },
  ],
  actions: [
    {
      key: "slip",
      label: "ดูสลิป",
      when: (row) => Boolean(row.slip_url),
      run: (row) => openSlip(Number(row.payment_id)),
      done: "เปิดสลิปในแท็บใหม่แล้ว",
    },
    {
      key: "approve",
      label: "อนุมัติ",
      roles: ["STAFF", "ADMIN"],
      when: (row) => row.status === "รอตรวจสอบ",
      confirm: "อนุมัติรายการชำระเงินนี้?",
      run: (row) => api.post(`/payments/${row.payment_id}/approve`),
      done: "อนุมัติแล้ว",
    },
    {
      key: "reject",
      label: "ปฏิเสธ",
      roles: ["STAFF", "ADMIN"],
      danger: true,
      when: (row) => row.status === "รอตรวจสอบ",
      fields: [{ name: "note", label: "เหตุผล (ผู้เช่าจะเห็นข้อความนี้)", type: "textarea" }],
      schema: z.object({ note: z.string().trim().max(500).optional() }),
      run: (row, input) => api.post(`/payments/${row.payment_id}/reject`, input),
      done: "ปฏิเสธรายการแล้ว",
    },
  ],
};
