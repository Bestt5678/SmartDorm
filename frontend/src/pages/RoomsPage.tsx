import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/apiClient'
import { Badge, Button, Field, inputCls, Message, State } from '../components/SharedUI'
import { useAuth } from '../features/auth/AuthContext'
import { money, today } from '../lib/moneyAndDate'

const ROOM_STATUS = ['ว่าง', 'ไม่ว่าง', 'ปิดปรับปรุง']
const emptyForm = { room_number: '', floor: '', room_type_id: '', monthly_rate: '', status: 'ว่าง' }

export default function RoomsPage() {
  const { user } = useAuth()
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN'

  const [rooms, setRooms] = useState<any[]>([])
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<any>({})

  const [bookingRoom, setBookingRoom] = useState<any>(null)
  const [moveInDate, setMoveInDate] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/rooms')
        setRooms(res.data)
        if (isStaff) {
          const typeRes = await api.get('/room-types')
          setRoomTypes(typeRes.data)
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

  function openForm(room: any) {
    if (room) {
      setForm({
        room_number: room.room_number,
        floor: String(room.floor),
        room_type_id: String(room.room_type_id),
        monthly_rate: String(room.monthly_rate),
        status: room.status,
      })
      setEditId(room.room_id)
    } else {
      setForm(emptyForm)
      setEditId(null)
    }
    setErrors({})
    setBookingRoom(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const newErrors: any = {}
    if (form.room_number.trim() === '') newErrors.room_number = 'กรอกเลขห้อง'
    if (form.floor === '' || Number(form.floor) < 1) newErrors.floor = 'ชั้นต้องเป็น 1 ขึ้นไป'
    if (form.room_type_id === '') newErrors.room_type_id = 'เลือกประเภทห้อง'
    if (form.monthly_rate === '' || Number(form.monthly_rate) < 0)
      newErrors.monthly_rate = 'กรอกค่าเช่า (ห้ามติดลบ)'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      if (editId) {
        await api.patch('/rooms/' + editId, form)
      } else {
        await api.post('/rooms', form)
      }
      showSuccess('บันทึกแล้ว')
      setShowForm(false)
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  async function handleDelete(room: any) {
    if (!confirm('ลบห้อง ' + room.room_number + '?')) return
    try {
      await api.delete('/rooms/' + room.room_id)
      showSuccess('ลบแล้ว')
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  function openBooking(room: any) {
    setShowForm(false)
    setBookingRoom(room)
    setMoveInDate(today())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleBooking(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/bookings', { room_id: bookingRoom.room_id, move_in_date: moveInDate })
      setBookingRoom(null)
      showSuccess('ส่งคำขอจองแล้ว รอเจ้าหน้าที่ยืนยัน (ดูได้ที่เมนู การจอง)')
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">ห้องพัก</h2>
        {isStaff && (
          <Button type="button" onClick={() => (showForm ? setShowForm(false) : openForm(null))}>
            {showForm ? 'ปิดฟอร์ม' : '+ เพิ่มข้อมูล'}
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
        >
          <h3 className="font-semibold sm:col-span-2">{editId ? 'แก้ไขห้อง' : 'เพิ่มห้อง'}</h3>
          <Field label="เลขห้อง" error={errors.room_number}>
            <input
              className={inputCls}
              value={form.room_number}
              onChange={(e) => setForm({ ...form, room_number: e.target.value })}
            />
          </Field>
          <Field label="ชั้น" error={errors.floor}>
            <input
              type="number"
              className={inputCls}
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
            />
          </Field>
          <Field label="ประเภทห้อง" error={errors.room_type_id}>
            <select
              className={inputCls}
              value={form.room_type_id}
              onChange={(e) => setForm({ ...form, room_type_id: e.target.value })}
            >
              <option value="">เลือก…</option>
              {roomTypes.map((type) => (
                <option key={type.room_type_id} value={type.room_type_id}>
                  {type.type_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ค่าเช่า/เดือน" error={errors.monthly_rate}>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={form.monthly_rate}
              onChange={(e) => setForm({ ...form, monthly_rate: e.target.value })}
            />
          </Field>
          <Field label="สถานะ">
            <select
              className={inputCls}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {ROOM_STATUS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Button>บันทึก</Button>
          </div>
        </form>
      )}

      {bookingRoom && (
        <form
          onSubmit={handleBooking}
          className="mb-6 grid gap-3 rounded-xl border border-accent/40 bg-white p-4 sm:grid-cols-2"
        >
          <h3 className="font-semibold sm:col-span-2">จองห้อง {bookingRoom.room_number}</h3>
          <Field label="วันที่ต้องการย้ายเข้า">
            <input
              type="date"
              required
              className={inputCls}
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
            />
          </Field>
          <div className="space-x-2 sm:col-span-2">
            <Button>ยืนยัน</Button>
            <button
              type="button"
              onClick={() => setBookingRoom(null)}
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
        empty={rooms.length === 0}
        onRetry={() => setReload(reload + 1)}
      />

      {rooms.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">ห้อง</th>
                <th className="p-3">ชั้น</th>
                <th className="p-3">ประเภทห้อง</th>
                <th className="p-3">ค่าเช่า</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.room_id} className="border-t border-slate-100">
                  <td className="p-3">{room.room_number}</td>
                  <td className="p-3">{room.floor}</td>
                  <td className="p-3">{room.room_type?.type_name}</td>
                  <td className="p-3">{money(room.monthly_rate)}</td>
                  <td className="p-3">
                    <Badge value={room.status} />
                  </td>
                  <td className="space-x-3 whitespace-nowrap p-3 text-right">
                    {user?.role === 'TENANT' && room.status === 'ว่าง' && (
                      <button
                        onClick={() => openBooking(room)}
                        className="font-medium text-accent hover:underline"
                      >
                        จองห้องนี้
                      </button>
                    )}
                    {isStaff && (
                      <>
                        <button
                          onClick={() => openForm(room)}
                          className="text-slate-600 hover:underline"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDelete(room)}
                          className="text-red-700 hover:underline"
                        >
                          ลบ
                        </button>
                      </>
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
