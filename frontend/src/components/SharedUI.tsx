import type { ReactNode } from 'react'

const good = 'bg-emerald-100 text-emerald-800'
const wait = 'bg-amber-100 text-amber-800'
const bad = 'bg-red-100 text-red-800'

const tone: Record<string, string> = {
  ว่าง: good,
  ชำระแล้ว: good,
  เสร็จสิ้น: good,
  ยืนยันแล้ว: good,
  อนุมัติแล้ว: good,
  ไม่ว่าง: 'bg-slate-200 text-slate-700',
  กำลังดำเนินการ: 'bg-sky-100 text-sky-800',
  ชำระบางส่วน: 'bg-sky-100 text-sky-800',
  ค้างชำระ: wait,
  รอดำเนินการ: wait,
  รอตรวจสอบ: wait,
  ปิดปรับปรุง: 'bg-orange-100 text-orange-800',
  เกินกำหนด: bad,
  ยกเลิก: bad,
  ปฏิเสธ: bad,
}

export const Badge = ({ value }: { value: string }) => (
  <span
    className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[value] ?? 'bg-slate-100'}`}
  >
    {value}
  </span>
)

export function State({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading: boolean
  error: string | null
  empty: boolean
  onRetry: () => void
}) {
  if (loading) return <p className="py-8 text-center text-slate-500">กำลังโหลด…</p>
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}{' '}
        <button onClick={onRetry} className="font-medium underline">
          ลองใหม่
        </button>
      </div>
    )
  if (empty) return <p className="py-8 text-center text-slate-500">ยังไม่มีข้อมูล</p>
  return null
}

export const Field = ({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium">{label}</span>
    {children}
    {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
  </label>
)

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30'

export const Button = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...p}
    className={`rounded-lg bg-accent px-4 py-2 font-medium text-white hover:brightness-110 disabled:opacity-50 ${p.className ?? ''}`}
  />
)

export const Stat = ({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="text-sm text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-bold">{value}</div>
    {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
  </div>
)

export const Message = ({ text, error }: { text: string; error?: boolean }) => {
  if (!text) return null
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`mb-3 rounded-lg p-3 text-sm ${error ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}
    >
      {text}
    </p>
  )
}
