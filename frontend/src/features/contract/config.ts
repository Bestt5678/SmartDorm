import { z } from "zod";
import type { ResourceConfig, Row } from "../../components/ResourcePage";
import { date, id, money } from "../../lib/zodHelpers";
import { bookingLabel, contractLabel, roomNo, tenantName } from "../labels";

const booking = (row: Row) => (row.booking ?? {}) as Row;

const dates = z
  .object({ start_date: date, end_date: date, deposit: money("กรอกเงินมัดจำ") })
  .refine((v) => v.end_date > v.start_date, { path: ["end_date"], message: "วันสิ้นสุดต้องหลังวันเริ่มสัญญา" });

export const contractConfig: ResourceConfig = {
  title: "สัญญาเช่า",
  description: "สร้างสัญญาจากการจองที่รอดำเนินการ ระบบจะยืนยันการจองและออกใบแจ้งหนี้เงินมัดจำให้",
  endpoint: "/contracts",
  pk: "contract_id",
  rowLabel: contractLabel,
  createLabel: "สร้างสัญญา",
  rowSchema: z.object({
    contract_id: z.coerce.number(),
    booking_id: z.coerce.number(),
    start_date: z.string(),
    end_date: z.string(),
    deposit: z.coerce.number(),
  }),
  // ตรงกับ CHECK (end_date > start_date) ใน DB
  formSchema: z
    .object({ booking_id: id("เลือกการจอง"), start_date: date, end_date: date, deposit: money("กรอกเงินมัดจำ") })
    .refine((v) => v.end_date > v.start_date, { path: ["end_date"], message: "วันสิ้นสุดต้องหลังวันเริ่มสัญญา" }),
  edit: { fields: ["start_date", "end_date", "deposit"], schema: dates },
  fields: [
    {
      name: "booking_id", label: "การจอง (ที่รอดำเนินการ)", type: "ref",
      source: { endpoint: "/bookings", value: "booking_id", label: bookingLabel, filter: (r) => r.status === "รอดำเนินการ" },
    },
    { name: "start_date", label: "วันเริ่มสัญญา", type: "date" },
    { name: "end_date", label: "วันสิ้นสุดสัญญา", type: "date" },
    { name: "deposit", label: "เงินมัดจำ", type: "number" },
  ],
  columns: [
    { key: "contract_id", label: "#" },
    { key: "room", label: "ห้อง", render: (row) => roomNo(booking(row)) },
    { key: "tenant", label: "ผู้เช่า", render: (row) => tenantName(booking(row)) },
    { key: "start_date", label: "เริ่ม", kind: "date" },
    { key: "end_date", label: "สิ้นสุด", kind: "date" },
    { key: "deposit", label: "เงินมัดจำ", kind: "money" },
    { key: "booking_status", label: "สถานะ", render: (row) => String(booking(row).status ?? "-") },
  ],
};
