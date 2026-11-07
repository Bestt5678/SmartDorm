import { z } from "zod";
import { api } from "../../api/client";
import type { ResourceConfig, Row } from "../../components/ResourcePage";
import { date, id, money, optionalId } from "../../lib/zodHelpers";
import { contractLabel, roomNo } from "../labels";
import { PAYMENT_TYPES } from "../payment/config";

const INVOICE_TYPES = [
  { value: "RENT", label: "ค่าเช่า" },
  { value: "UTILITY", label: "ค่าน้ำ-ไฟ" },
  { value: "DEPOSIT", label: "เงินมัดจำ" },
  { value: "OTHER", label: "อื่นๆ" },
] as const;
const typeLabel = (v: unknown) => INVOICE_TYPES.find((t) => t.value === v)?.label ?? String(v ?? "-");

/** สถานะที่ยังชำระได้ (สถานะ "รอตรวจสอบ" ต้องรอเจ้าหน้าที่ตรวจสลิปก่อน) */
const PAYABLE = ["ค้างชำระ", "ชำระบางส่วน", "เกินกำหนด"];

const contractRoom = (row: Row) => roomNo(((row.contract as Row | undefined)?.booking ?? {}) as Row);

const amounts = {
  rent_amount: money("กรอกค่าเช่า"),
  water_amount: money("กรอกค่าน้ำ"),
  electric_amount: money("กรอกค่าไฟ"),
};

export const invoiceConfig: ResourceConfig = {
  title: "ใบแจ้งหนี้",
  description: "สถานะคำนวณจากยอดที่ชำระแล้วอัตโนมัติ ถ้าเลือกรอบมิเตอร์ ระบบจะคิดค่าน้ำ-ไฟให้ตามอัตราที่ตั้งไว้",
  endpoint: "/invoices",
  pk: "invoice_id",
  rowLabel: (row) => `ใบแจ้งหนี้ #${row.invoice_id} (ห้อง ${contractRoom(row)})`,
  createLabel: "ออกใบแจ้งหนี้",
  rowSchema: z.object({
    invoice_id: z.coerce.number(),
    contract_id: z.coerce.number(),
    meter_id: z.coerce.number().nullish(),
    invoice_date: z.string(),
    due_date: z.string(),
    rent_amount: z.coerce.number(),
    water_amount: z.coerce.number(),
    electric_amount: z.coerce.number(),
    total_amount: z.coerce.number(),
    paid_amount: z.coerce.number(),
    balance: z.coerce.number(),
    status: z.string(),
  }),
  formSchema: z.object({
    contract_id: id("เลือกสัญญา"),
    meter_id: optionalId,
    invoice_type: z.enum(["RENT", "UTILITY", "DEPOSIT", "OTHER"], { error: "เลือกประเภท" }),
    due_date: date,
    ...amounts,
  }),
  edit: { fields: ["due_date", "rent_amount", "water_amount", "electric_amount"], schema: z.object({ due_date: date, ...amounts }) },
  fields: [
    { name: "contract_id", label: "สัญญา", type: "ref", source: { endpoint: "/contracts", value: "contract_id", label: contractLabel } },
    {
      name: "meter_id", label: "รอบมิเตอร์ (ถ้ามี)", type: "ref",
      source: {
        endpoint: "/utility-meters", value: "meter_id",
        label: (r) => `ห้อง ${roomNo(r)} · ${String(r.meter_month).slice(0, 7)}`,
      },
    },
    { name: "invoice_type", label: "ประเภท", type: "select", options: INVOICE_TYPES },
    { name: "due_date", label: "วันครบกำหนด", type: "date" },
    { name: "rent_amount", label: "ค่าเช่า", type: "number" },
    { name: "water_amount", label: "ค่าน้ำ", type: "number" },
    { name: "electric_amount", label: "ค่าไฟ", type: "number" },
  ],
  defaults: { invoice_type: "RENT", rent_amount: "0", water_amount: "0", electric_amount: "0" },
  columns: [
    { key: "invoice_id", label: "#" },
    { key: "room", label: "ห้อง", render: contractRoom },
    { key: "invoice_type", label: "ประเภท", render: (row) => typeLabel(row.invoice_type) },
    { key: "due_date", label: "ครบกำหนด", kind: "date" },
    { key: "total_amount", label: "ยอดรวม", kind: "money" },
    { key: "paid_amount", label: "ชำระแล้ว", kind: "money" },
    { key: "balance", label: "คงเหลือ", kind: "money" },
    { key: "status", label: "สถานะ", kind: "badge" },
  ],
  actions: [
    {
      key: "pay",
      label: "ชำระเงิน / แนบสลิป",
      roles: ["TENANT"],
      when: (row) => PAYABLE.includes(String(row.status)),
      fields: [
        { name: "amount", label: "จำนวนเงิน", type: "number" },
        { name: "payment_type", label: "ช่องทางชำระ", type: "select", options: PAYMENT_TYPES },
        { name: "slip", label: "สลิป (JPG, PNG, WEBP หรือ PDF ไม่เกิน 5MB)", type: "file", accept: "image/jpeg,image/png,image/webp,application/pdf" },
      ],
      schema: z.object({
        amount: z.string().min(1, "กรอกจำนวนเงิน").pipe(z.coerce.number<string>().positive("ยอดต้องมากกว่า 0")),
        payment_type: z.enum(PAYMENT_TYPES, { error: "เลือกช่องทางชำระ" }),
        slip: z.instanceof(File, { message: "แนบสลิปการชำระเงิน" })
          .refine((f) => f.size <= 5 * 1024 * 1024, "ไฟล์ต้องไม่เกิน 5MB"),
      }),
      defaults: (row) => ({ amount: String(row.balance ?? ""), payment_type: "โอนเงิน" }),
      run: (row, input) => api.post(`/invoices/${row.invoice_id}/payments`, input),
      done: "ส่งสลิปแล้ว รอเจ้าหน้าที่ตรวจสอบ",
    },
    {
      key: "cancel",
      label: "ยกเลิกใบแจ้งหนี้",
      roles: ["STAFF", "ADMIN"],
      danger: true,
      when: (row) => !["ชำระแล้ว", "ยกเลิก"].includes(String(row.status)),
      confirm: "ยกเลิกใบแจ้งหนี้นี้? (ทำได้เมื่อไม่มีรายการชำระที่รอตรวจสอบหรืออนุมัติแล้ว)",
      run: (row) => api.post(`/invoices/${row.invoice_id}/cancel`),
      done: "ยกเลิกใบแจ้งหนี้แล้ว",
    },
  ],
};
