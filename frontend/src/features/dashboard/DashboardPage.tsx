import { useEffect, useState } from "react";
import { z } from "zod";
import { api, errorMessage } from "../../api/client";
import { Badge, State, Stat } from "../../components/ui";
import { money } from "../../lib/format";
import type { Row } from "../../components/ResourcePage";
import { roomNo, tenantName } from "../labels";

const n = z.coerce.number();
const SummarySchema = z.object({
  rooms: z.object({ total: n, available: n, occupied: n, maintenance: n }),
  tenants: n,
  bookings: z.object({ total: n, pending: n, confirmed: n, cancelled: n, completed: n }),
  repairs: z.object({ total: n, pending: n, in_progress: n, completed: n }),
  finance: z.object({
    outstanding_amount: n,
    paid_this_month: n,
    revenue_by_month: z.array(z.object({ month: z.string(), total: n })),
  }),
  recent_bookings: z.array(z.record(z.string(), z.unknown())),
  recent_invoices: z.array(z.record(z.string(), z.unknown())),
  recent_repairs: z.array(z.record(z.string(), z.unknown())),
});
type Summary = z.infer<typeof SummarySchema>;

const monthLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { month: "short", year: "2-digit", timeZone: "UTC" });

function RevenueBars({ rows }: { rows: Summary["finance"]["revenue_by_month"] }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-500">ยังไม่มีรายรับใน 6 เดือนล่าสุด</p>;
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <ul className="space-y-2" aria-label="รายรับรายเดือน">
      {rows.map((r) => (
        <li key={r.month} className="grid grid-cols-[4.5rem_1fr_7rem] items-center gap-3 text-sm">
          <span className="text-slate-600">{monthLabel(r.month)}</span>
          <span className="h-3 rounded-full bg-slate-100">
            <span className="block h-3 rounded-full bg-accent" style={{ width: `${(r.total / max) * 100}%` }} />
          </span>
          <span className="text-right font-medium tabular-nums">{money(r.total)}</span>
        </li>
      ))}
    </ul>
  );
}

function RecentList({ title, rows, render }: { title: string; rows: Row[]; render: (row: Row) => React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {rows.length ? <ul className="divide-y divide-slate-100 text-sm">{rows.map(render)}</ul>
        : <p className="text-sm text-slate-500">ยังไม่มีข้อมูล</p>}
    </section>
  );
}

/** ภาพรวมสำหรับเจ้าหน้าที่: ห้อง การจอง งานซ่อม และการเงิน */
export default function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [version, setVersion] = useState(0);
  const load = () => {
    setLoading(true);
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    let cancelled = false;
    api
      .get("/dashboard/summary")
      .then((res) => {
        if (cancelled) return;
        setData(SummarySchema.parse(res.data));
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  if (!data) return <State loading={loading} error={error} empty={false} onRetry={load} />;
  const { rooms, bookings, repairs, finance } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ภาพรวม</h2>
        <button onClick={load} className="text-sm text-accent hover:underline">รีเฟรช</button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ห้องว่าง" value={`${rooms.available} / ${rooms.total}`} hint={`มีผู้เช่า ${rooms.occupied} · ปิดปรับปรุง ${rooms.maintenance}`} />
        <Stat label="การจองรอยืนยัน" value={bookings.pending} hint={`ยืนยันแล้ว ${bookings.confirmed} รายการ`} />
        <Stat label="งานซ่อมค้าง" value={repairs.pending + repairs.in_progress} hint={`รอดำเนินการ ${repairs.pending} · กำลังทำ ${repairs.in_progress}`} />
        <Stat label="ผู้เช่าทั้งหมด" value={data.tenants} />
        <Stat label="รับชำระเดือนนี้" value={`${money(finance.paid_this_month)} ฿`} hint="นับเฉพาะรายการที่อนุมัติแล้ว" />
        <Stat label="ยอดค้างชำระ" value={`${money(finance.outstanding_amount)} ฿`} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold">รายรับ 6 เดือนล่าสุด (บาท)</h3>
        <RevenueBars rows={finance.revenue_by_month} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <RecentList title="การจองล่าสุด" rows={data.recent_bookings} render={(b) => (
          <li key={String(b.booking_id)} className="flex items-center justify-between gap-2 py-2">
            <span>ห้อง {roomNo(b)} · {tenantName(b)}</span><Badge value={String(b.status)} />
          </li>
        )} />
        <RecentList title="ใบแจ้งหนี้ล่าสุด" rows={data.recent_invoices} render={(i) => (
          <li key={String(i.invoice_id)} className="flex items-center justify-between gap-2 py-2">
            <span>#{String(i.invoice_id)} · {money(i.total_amount)} ฿</span><Badge value={String(i.status)} />
          </li>
        )} />
        <RecentList title="แจ้งซ่อมล่าสุด" rows={data.recent_repairs} render={(r) => (
          <li key={String(r.repair_id)} className="flex items-center justify-between gap-2 py-2">
            <span className="truncate">ห้อง {roomNo(r)} · {String(r.description)}</span><Badge value={String(r.status)} />
          </li>
        )} />
      </div>
    </div>
  );
}
