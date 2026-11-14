import { money } from '../../lib/moneyAndDate'

const monthLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('th-TH', { month: 'short', year: '2-digit', timeZone: 'UTC' })

export default function RevenueBars({ rows }: { rows: { month: string; total: number }[] }) {
  if (!rows.length)
    return <p className="py-6 text-center text-sm text-slate-500">ยังไม่มีรายรับใน 6 เดือนล่าสุด</p>
  const max = Math.max(...rows.map((r) => r.total), 1)
  return (
    <ul className="space-y-2" aria-label="รายรับรายเดือน">
      {rows.map((r) => (
        <li key={r.month} className="grid grid-cols-[4.5rem_1fr_7rem] items-center gap-3 text-sm">
          <span className="text-slate-600">{monthLabel(r.month)}</span>
          <span className="h-3 rounded-full bg-slate-100">
            <span
              className="block h-3 rounded-full bg-accent"
              style={{ width: `${(r.total / max) * 100}%` }}
            />
          </span>
          <span className="text-right font-medium tabular-nums">{money(r.total)}</span>
        </li>
      ))}
    </ul>
  )
}
