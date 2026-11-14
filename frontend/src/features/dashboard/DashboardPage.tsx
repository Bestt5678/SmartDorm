import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../api/apiClient'
import { Badge, State, Stat } from '../../components/SharedUI'
import { money } from '../../lib/moneyAndDate'
import RecentList from './RecentList'
import RevenueBars from './RevenueBars'

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/dashboard/summary')
        setData(res.data)
        setError('')
      } catch (err) {
        setError(errorMessage(err))
      }
      setLoading(false)
    }
    loadData()
  }, [reload])

  if (!data) {
    return (
      <State
        loading={loading}
        error={error || null}
        empty={false}
        onRetry={() => setReload(reload + 1)}
      />
    )
  }

  const rooms = data.rooms
  const bookings = data.bookings
  const repairs = data.repairs
  const finance = data.finance

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ภาพรวม</h2>
        <button
          onClick={() => setReload(reload + 1)}
          className="text-sm text-accent hover:underline"
        >
          รีเฟรช
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="ห้องว่าง"
          value={rooms.available + ' / ' + rooms.total}
          hint={'มีผู้เช่า ' + rooms.occupied + ' · ปิดปรับปรุง ' + rooms.maintenance}
        />
        <Stat
          label="การจองรอยืนยัน"
          value={bookings.pending}
          hint={'ยืนยันแล้ว ' + bookings.confirmed + ' รายการ'}
        />
        <Stat
          label="งานซ่อมค้าง"
          value={repairs.pending + repairs.in_progress}
          hint={'รอดำเนินการ ' + repairs.pending + ' · กำลังทำ ' + repairs.in_progress}
        />
        <Stat label="ผู้เช่าทั้งหมด" value={data.tenants} />
        <Stat
          label="รับชำระเดือนนี้"
          value={money(finance.paid_this_month) + ' ฿'}
          hint="นับเฉพาะรายการที่อนุมัติแล้ว"
        />
        <Stat label="ยอดค้างชำระ" value={money(finance.outstanding_amount) + ' ฿'} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold">รายรับ 6 เดือนล่าสุด (บาท)</h3>
        <RevenueBars rows={finance.revenue_by_month} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <RecentList
          title="การจองล่าสุด"
          rows={data.recent_bookings}
          render={(b) => (
            <li key={b.booking_id} className="flex items-center justify-between gap-2 py-2">
              <span>
                ห้อง {b.room?.room_number} · {b.tenant?.full_name}
              </span>
              <Badge value={b.status} />
            </li>
          )}
        />
        <RecentList
          title="ใบแจ้งหนี้ล่าสุด"
          rows={data.recent_invoices}
          render={(i) => (
            <li key={i.invoice_id} className="flex items-center justify-between gap-2 py-2">
              <span>
                #{i.invoice_id} · {money(i.total_amount)} ฿
              </span>
              <Badge value={i.status} />
            </li>
          )}
        />
        <RecentList
          title="แจ้งซ่อมล่าสุด"
          rows={data.recent_repairs}
          render={(r) => (
            <li key={r.repair_id} className="flex items-center justify-between gap-2 py-2">
              <span className="truncate">
                ห้อง {r.room?.room_number} · {r.description}
              </span>
              <Badge value={r.status} />
            </li>
          )}
        />
      </div>
    </div>
  )
}
