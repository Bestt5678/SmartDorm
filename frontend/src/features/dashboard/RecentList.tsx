import type { ReactNode } from 'react'

export default function RecentList({
  title,
  rows,
  render,
}: {
  title: string
  rows: any[]
  render: (row: any) => ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {rows.length ? (
        <ul className="divide-y divide-slate-100 text-sm">{rows.map(render)}</ul>
      ) : (
        <p className="text-sm text-slate-500">ยังไม่มีข้อมูล</p>
      )}
    </section>
  )
}
