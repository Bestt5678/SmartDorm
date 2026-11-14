import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/apiClient'
import { Button, Field, inputCls, Message, State } from '../components/SharedUI'
import { useAuth } from '../features/auth/AuthContext'
import { money, showDate } from '../lib/moneyAndDate'

const emptyForm = { booking_id: '', start_date: '', end_date: '', deposit: '' }

export default function ContractsPage() {
  const { user } = useAuth()
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN'

  const [contracts, setContracts] = useState<any[]>([])
  const [pendingBookings, setPendingBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<any>({})

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/contracts')
        setContracts(res.data)
        if (isStaff) {
          const bookingRes = await api.get('/bookings?status=รอดำเนินการ')
          setPendingBookings(bookingRes.data)
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

  function openForm(contract: any) {
    if (contract) {
      setForm({
        booking_id: String(contract.booking_id),
        start_date: showDate(contract.start_date),
        end_date: showDate(contract.end_date),
        deposit: String(contract.deposit),
      })
      setEditId(contract.contract_id)
    } else {
      setForm(emptyForm)
      setEditId(null)
    }
    setErrors({})
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const newErrors: any = {}
    if (!editId && form.booking_id === '') newErrors.booking_id = 'เลือกการจอง'
    if (form.start_date === '') newErrors.start_date = 'เลือกวันที่'
    if (form.end_date === '') newErrors.end_date = 'เลือกวันที่'
    else if (form.end_date <= form.start_date)
      newErrors.end_date = 'วันสิ้นสุดต้องหลังวันเริ่มสัญญา'
    if (form.deposit === '' || Number(form.deposit) < 0)
      newErrors.deposit = 'กรอกเงินมัดจำ (ห้ามติดลบ)'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      if (editId) {
        await api.patch('/contracts/' + editId, form)
      } else {
        await api.post('/contracts', form)
      }
      showSuccess('บันทึกแล้ว')
      setShowForm(false)
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  async function handleDelete(contract: any) {
    if (!confirm('ลบรายการนี้?')) return
    try {
      await api.delete('/contracts/' + contract.contract_id)
      showSuccess('ลบแล้ว')
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">สัญญาเช่า</h2>
          {isStaff && (
            <p className="text-sm text-slate-500">
              สร้างสัญญาจากการจองที่รอดำเนินการ ระบบจะยืนยันการจองและออกใบแจ้งหนี้เงินมัดจำให้
            </p>
          )}
        </div>
        {isStaff && (
          <Button type="button" onClick={() => (showForm ? setShowForm(false) : openForm(null))}>
            {showForm ? 'ปิดฟอร์ม' : '+ สร้างสัญญา'}
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
        >
          <h3 className="font-semibold sm:col-span-2">
            {editId ? 'แก้ไขสัญญา #' + editId : 'สร้างสัญญา'}
          </h3>
          {!editId && (
            <Field label="การจอง (ที่รอดำเนินการ)" error={errors.booking_id}>
              <select
                className={inputCls}
                value={form.booking_id}
                onChange={(e) => setForm({ ...form, booking_id: e.target.value })}
              >
                <option value="">เลือก…</option>
                {pendingBookings.map((booking) => (
                  <option key={booking.booking_id} value={booking.booking_id}>
                    #{booking.booking_id} ห้อง {booking.room?.room_number}{' '}
                    {booking.tenant?.full_name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="วันเริ่มสัญญา" error={errors.start_date}>
            <input
              type="date"
              className={inputCls}
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </Field>
          <Field label="วันสิ้นสุดสัญญา" error={errors.end_date}>
            <input
              type="date"
              className={inputCls}
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </Field>
          <Field label="เงินมัดจำ" error={errors.deposit}>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={form.deposit}
              onChange={(e) => setForm({ ...form, deposit: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Button>บันทึก</Button>
          </div>
        </form>
      )}

      <Message text={message} error={isError} />
      <State
        loading={loading}
        error={loadError || null}
        empty={contracts.length === 0}
        onRetry={() => setReload(reload + 1)}
      />

      {contracts.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">ห้อง</th>
                <th className="p-3">ผู้เช่า</th>
                <th className="p-3">เริ่ม</th>
                <th className="p-3">สิ้นสุด</th>
                <th className="p-3">เงินมัดจำ</th>
                <th className="p-3">สถานะ</th>
                {isStaff && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract.contract_id} className="border-t border-slate-100">
                  <td className="p-3">{contract.contract_id}</td>
                  <td className="p-3">{contract.booking?.room?.room_number}</td>
                  <td className="p-3">{contract.booking?.tenant?.full_name}</td>
                  <td className="p-3">{showDate(contract.start_date)}</td>
                  <td className="p-3">{showDate(contract.end_date)}</td>
                  <td className="p-3">{money(contract.deposit)}</td>
                  <td className="p-3">{contract.booking?.status}</td>
                  {isStaff && (
                    <td className="space-x-3 whitespace-nowrap p-3 text-right">
                      <button
                        onClick={() => openForm(contract)}
                        className="text-slate-600 hover:underline"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(contract)}
                        className="text-red-700 hover:underline"
                      >
                        ลบ
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
