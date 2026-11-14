import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/apiClient'
import { Badge, Button, Field, inputCls, Message, State } from '../components/SharedUI'
import { useAuth } from '../features/auth/AuthContext'
import { oneYearLater, showDate } from '../lib/moneyAndDate'

const emptyForm = { room_id: '', tenant_id: '', move_in_date: '' }

export default function BookingsPage() {
  const { user } = useAuth()
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN'

  const [bookings, setBookings] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<any>({})

  const [confirmBooking, setConfirmBooking] = useState<any>(null)
  const [confirmForm, setConfirmForm] = useState({ start_date: '', end_date: '', deposit: '' })

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/bookings')
        setBookings(res.data)
        const roomRes = await api.get('/rooms?status=ว่าง')
        setRooms(roomRes.data)
        if (isStaff) {
          const tenantRes = await api.get('/tenants')
          setTenants(tenantRes.data)
        }
        setLoadError('')
      } catch (err) {
        setLoadError(errorMessage(err))
      }
      setLoading(false)
    }
    loadData()
  }, [reload, isStaff])

  function showSuccess(text: string) {
    setMessage(text)
    setIsError(false)
  }

  function showError(err: any) {
    setMessage(errorMessage(err))
    setIsError(true)
  }

  function openForm() {
    setForm(emptyForm)
    setErrors({})
    setConfirmBooking(null)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const newErrors: any = {}
    if (form.room_id === '') newErrors.room_id = 'เลือกห้อง'
    if (isStaff && form.tenant_id === '') newErrors.tenant_id = 'เลือกผู้เช่า'
    if (form.move_in_date === '') newErrors.move_in_date = 'เลือกวันที่'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      await api.post('/bookings', form)
      showSuccess('บันทึกแล้ว')
      setShowForm(false)
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  function openConfirm(booking: any) {
    const start = showDate(booking.move_in_date)
    setConfirmForm({ start_date: start, end_date: oneYearLater(start), deposit: '' })
    setShowForm(false)
    setConfirmBooking(booking)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/bookings/' + confirmBooking.booking_id + '/confirm', confirmForm)
      setConfirmBooking(null)
      showSuccess('ยืนยันการจองแล้ว ระบบสร้างสัญญาและใบแจ้งหนี้เงินมัดจำให้')
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  async function doAction(booking: any, action: string) {
    const texts: any = {
      complete: 'ปิดสัญญาและคืนสถานะห้องเป็นว่าง? (ต้องไม่มีใบแจ้งหนี้ค้างชำระ)',
      cancel: 'ยืนยันการยกเลิกการจองนี้?',
      delete: 'ลบรายการนี้?',
    }
    if (!confirm(texts[action])) return
    try {
      if (action === 'delete') {
        await api.delete('/bookings/' + booking.booking_id)
      } else {
        await api.post('/bookings/' + booking.booking_id + '/' + action)
      }
      showSuccess('บันทึกแล้ว')
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">การจอง</h2>
          <p className="text-sm text-slate-500">
            ยืนยันการจองเพื่อออกสัญญาเช่าและใบแจ้งหนี้เงินมัดจำให้อัตโนมัติ
          </p>
        </div>
        <Button type="button" onClick={() => (showForm ? setShowForm(false) : openForm())}>
          {showForm ? 'ปิดฟอร์ม' : '+ จองห้อง'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
        >
          <h3 className="font-semibold sm:col-span-2">จองห้อง</h3>
          <Field label="ห้อง (เฉพาะห้องว่าง)" error={errors.room_id}>
            <select
              className={inputCls}
              value={form.room_id}
              onChange={(e) => setForm({ ...form, room_id: e.target.value })}
            >
              <option value="">เลือก…</option>
              {rooms.map((room) => (
                <option key={room.room_id} value={room.room_id}>
                  {room.room_number}
                </option>
              ))}
            </select>
          </Field>
          {isStaff && (
            <Field label="ผู้เช่า" error={errors.tenant_id}>
              <select
                className={inputCls}
                value={form.tenant_id}
                onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
              >
                <option value="">เลือก…</option>
                {tenants.map((tenant) => (
                  <option key={tenant.tenant_id} value={tenant.tenant_id}>
                    {tenant.full_name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="วันที่เข้าพัก" error={errors.move_in_date}>
            <input
              type="date"
              className={inputCls}
              value={form.move_in_date}
              onChange={(e) => setForm({ ...form, move_in_date: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Button>บันทึก</Button>
          </div>
        </form>
      )}

      {confirmBooking && (
        <form
          onSubmit={handleConfirm}
          className="mb-6 grid gap-3 rounded-xl border border-accent/40 bg-white p-4 sm:grid-cols-2"
        >
          <h3 className="font-semibold sm:col-span-2">
            ยืนยัน + ออกสัญญา การจอง #{confirmBooking.booking_id} ห้อง{' '}
            {confirmBooking.room?.room_number}
          </h3>
          <Field label="วันเริ่มสัญญา">
            <input
              type="date"
              required
              className={inputCls}
              value={confirmForm.start_date}
              onChange={(e) => setConfirmForm({ ...confirmForm, start_date: e.target.value })}
            />
          </Field>
          <Field label="วันสิ้นสุดสัญญา">
            <input
              type="date"
              required
              className={inputCls}
              value={confirmForm.end_date}
              onChange={(e) => setConfirmForm({ ...confirmForm, end_date: e.target.value })}
            />
          </Field>
          <Field label="เงินมัดจำ (ออกใบแจ้งหนี้ให้อัตโนมัติ)">
            <input
              type="number"
              step="any"
              required
              min="0"
              className={inputCls}
              value={confirmForm.deposit}
              onChange={(e) => setConfirmForm({ ...confirmForm, deposit: e.target.value })}
            />
          </Field>
          <div className="space-x-2 sm:col-span-2">
            <Button>ยืนยัน</Button>
            <button
              type="button"
              onClick={() => setConfirmBooking(null)}
              className="px-4 py-2 text-slate-600"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      <Message text={message} error={isError} />
      <State
        loading={loading}
        error={loadError || null}
        empty={bookings.length === 0}
        onRetry={() => setReload(reload + 1)}
      />

      {bookings.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">ห้อง</th>
                <th className="p-3">ผู้เช่า</th>
                <th className="p-3">วันที่จอง</th>
                <th className="p-3">วันเข้าพัก</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.booking_id} className="border-t border-slate-100">
                  <td className="p-3">{booking.booking_id}</td>
                  <td className="p-3">{booking.room?.room_number}</td>
                  <td className="p-3">{booking.tenant?.full_name}</td>
                  <td className="p-3">{showDate(booking.booking_date)}</td>
                  <td className="p-3">{showDate(booking.move_in_date)}</td>
                  <td className="p-3">
                    <Badge value={booking.status} />
                  </td>
                  <td className="space-x-3 whitespace-nowrap p-3 text-right">
                    {isStaff && booking.status === 'รอดำเนินการ' && (
                      <button
                        onClick={() => openConfirm(booking)}
                        className="font-medium text-accent hover:underline"
                      >
                        ยืนยัน + ออกสัญญา
                      </button>
                    )}
                    {isStaff && booking.status === 'ยืนยันแล้ว' && (
                      <button
                        onClick={() => doAction(booking, 'complete')}
                        className="font-medium text-accent hover:underline"
                      >
                        ปิดสัญญา (ย้ายออก)
                      </button>
                    )}
                    {(booking.status === 'รอดำเนินการ' || booking.status === 'ยืนยันแล้ว') && (
                      <button
                        onClick={() => doAction(booking, 'cancel')}
                        className="font-medium text-red-700 hover:underline"
                      >
                        ยกเลิกการจอง
                      </button>
                    )}
                    {isStaff && (
                      <button
                        onClick={() => doAction(booking, 'delete')}
                        className="text-red-700 hover:underline"
                      >
                        ลบ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
