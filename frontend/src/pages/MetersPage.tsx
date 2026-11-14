import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/apiClient'
import { Button, Field, inputCls, Message, State } from '../components/SharedUI'

const emptyForm = { room_id: '', meter_month: '', water_unit: '', electric_unit: '' }

export default function MetersPage() {
  const [meters, setMeters] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
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
        const res = await api.get('/utility-meters')
        setMeters(res.data)
        const roomRes = await api.get('/rooms')
        setRooms(roomRes.data)
        setLoadError('')
      } catch (err) {
        setLoadError(errorMessage(err))
      }
      setLoading(false)
    }
    loadData()
  }, [reload])

  function showSuccess(text: string) {
    setMessage(text)
    setIsError(false)
  }

  function showError(err: any) {
    setMessage(errorMessage(err))
    setIsError(true)
  }

  function openForm(meter: any) {
    if (meter) {
      setForm({
        room_id: String(meter.room_id),
        meter_month: String(meter.meter_month).slice(0, 10),
        water_unit: String(meter.water_unit),
        electric_unit: String(meter.electric_unit),
      })
      setEditId(meter.meter_id)
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
    if (form.room_id === '') newErrors.room_id = 'เลือกห้อง'
    if (form.meter_month === '') newErrors.meter_month = 'เลือกวันที่'
    if (form.water_unit === '' || Number(form.water_unit) < 0)
      newErrors.water_unit = 'กรอกหน่วยน้ำ (ห้ามติดลบ)'
    if (form.electric_unit === '' || Number(form.electric_unit) < 0)
      newErrors.electric_unit = 'กรอกหน่วยไฟ (ห้ามติดลบ)'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      if (editId) {
        await api.patch('/utility-meters/' + editId, form)
      } else {
        await api.post('/utility-meters', form)
      }
      showSuccess('บันทึกแล้ว')
      setShowForm(false)
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  async function handleDelete(meter: any) {
    if (!confirm('ลบรายการนี้?')) return
    try {
      await api.delete('/utility-meters/' + meter.meter_id)
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
          <h2 className="text-lg font-semibold">มิเตอร์น้ำ-ไฟ</h2>
          <p className="text-sm text-slate-500">
            จดหน่วยที่ใช้ในแต่ละเดือน แล้วเลือกมิเตอร์ตอนออกใบแจ้งหนี้ ระบบจะคำนวณค่าน้ำค่าไฟให้
          </p>
        </div>
        <Button type="button" onClick={() => (showForm ? setShowForm(false) : openForm(null))}>
          {showForm ? 'ปิดฟอร์ม' : '+ เพิ่มข้อมูล'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
        >
          <h3 className="font-semibold sm:col-span-2">
            {editId ? 'แก้ไขมิเตอร์' : 'เพิ่มมิเตอร์'}
          </h3>
          <Field label="ห้อง" error={errors.room_id}>
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
          <Field label="เดือนที่จด (วันที่ 1)" error={errors.meter_month}>
            <input
              type="date"
              className={inputCls}
              value={form.meter_month}
              onChange={(e) => setForm({ ...form, meter_month: e.target.value })}
            />
          </Field>
          <Field label="หน่วยน้ำ" error={errors.water_unit}>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={form.water_unit}
              onChange={(e) => setForm({ ...form, water_unit: e.target.value })}
            />
          </Field>
          <Field label="หน่วยไฟ" error={errors.electric_unit}>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={form.electric_unit}
              onChange={(e) => setForm({ ...form, electric_unit: e.target.value })}
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
        empty={meters.length === 0}
        onRetry={() => setReload(reload + 1)}
      />

      {meters.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">ห้อง</th>
                <th className="p-3">เดือน</th>
                <th className="p-3">น้ำ (หน่วย)</th>
                <th className="p-3">ไฟ (หน่วย)</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {meters.map((meter) => (
                <tr key={meter.meter_id} className="border-t border-slate-100">
                  <td className="p-3">{meter.meter_id}</td>
                  <td className="p-3">{meter.room?.room_number}</td>
                  <td className="p-3">{String(meter.meter_month).slice(0, 7)}</td>
                  <td className="p-3">{meter.water_unit}</td>
                  <td className="p-3">{meter.electric_unit}</td>
                  <td className="space-x-3 whitespace-nowrap p-3 text-right">
                    <button
                      onClick={() => openForm(meter)}
                      className="text-slate-600 hover:underline"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(meter)}
                      className="text-red-700 hover:underline"
                    >
                      ลบ
                    </button>
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
