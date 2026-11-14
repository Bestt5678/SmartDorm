import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/apiClient'
import { Badge, Button, Field, inputCls, Message, State } from '../components/SharedUI'
import { useAuth } from '../features/auth/AuthContext'
import { showDate } from '../lib/moneyAndDate'

const REPAIR_STATUS = ['รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จสิ้น', 'ยกเลิก']
const emptyForm = { room_id: '', description: '', staff_id: '', status: '' }

export default function RepairsPage() {
  const { user } = useAuth()
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN'

  const [repairs, setRepairs] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
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
        const res = await api.get('/repair-requests')
        setRepairs(res.data)
        if (isStaff) {
          const roomRes = await api.get('/rooms')
          setRooms(roomRes.data)
          const staffRes = await api.get('/staff')
          setStaffList(staffRes.data)
        } else {
          const contractRes = await api.get('/contracts')
          const myRooms = contractRes.data
            .filter((c: any) => c.booking.status === 'ยืนยันแล้ว')
            .map((c: any) => c.booking.room)
          setRooms(myRooms)
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

  function openForm(repair: any) {
    if (repair) {
      setForm({
        room_id: String(repair.room_id),
        description: repair.description,
        staff_id: repair.staff_id ? String(repair.staff_id) : '',
        status: repair.status,
      })
      setEditId(repair.repair_id)
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
    if (!editId && form.room_id === '') newErrors.room_id = 'เลือกห้อง'
    if (!editId && form.description.trim().length < 5)
      newErrors.description = 'อธิบายปัญหาอย่างน้อย 5 ตัวอักษร'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      if (editId) {
        await api.patch('/repair-requests/' + editId, {
          staff_id: form.staff_id,
          status: form.status,
        })
      } else if (isStaff) {
        await api.post('/repair-requests', form)
      } else {
        await api.post('/repair-requests', { room_id: form.room_id, description: form.description })
      }
      showSuccess('บันทึกแล้ว')
      setShowForm(false)
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  async function handleDelete(repair: any) {
    if (!confirm('ลบรายการนี้?')) return
    try {
      await api.delete('/repair-requests/' + repair.repair_id)
      showSuccess('ลบแล้ว')
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">แจ้งซ่อม</h2>
        <Button type="button" onClick={() => (showForm ? setShowForm(false) : openForm(null))}>
          {showForm ? 'ปิดฟอร์ม' : '+ แจ้งซ่อม'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
        >
          <h3 className="font-semibold sm:col-span-2">
            {editId ? 'แก้ไขแจ้งซ่อม #' + editId : 'แจ้งซ่อม'}
          </h3>
          {!editId && (
            <>
              <Field label="ห้อง" error={errors.room_id}>
                <select
                  className={inputCls}
                  value={form.room_id}
                  onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                >
                  <option value="">เลือก…</option>
                  {rooms.map((room) => (
                    <option key={room.room_id} value={room.room_id}>
                      ห้อง {room.room_number}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="ปัญหาที่พบ" error={errors.description}>
                <textarea
                  className={inputCls}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
            </>
          )}
          {isStaff && (
            <>
              <Field label="ผู้รับผิดชอบ">
                <select
                  className={inputCls}
                  value={form.staff_id}
                  onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                >
                  <option value="">เลือก…</option>
                  {staffList.map((staff) => (
                    <option key={staff.staff_id} value={staff.staff_id}>
                      {staff.full_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="สถานะ">
                <select
                  className={inputCls}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="">เลือก…</option>
                  {REPAIR_STATUS.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <div className="sm:col-span-2">
            <Button>บันทึก</Button>
          </div>
        </form>
      )}

      <Message text={message} error={isError} />
      <State
        loading={loading}
        error={loadError || null}
        empty={repairs.length === 0}
        onRetry={() => setReload(reload + 1)}
      />

      {repairs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">ห้อง</th>
                <th className="p-3">วันที่แจ้ง</th>
                <th className="p-3">รายละเอียด</th>
                <th className="p-3">ผู้รับผิดชอบ</th>
                <th className="p-3">สถานะ</th>
                {isStaff && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody>
              {repairs.map((repair) => (
                <tr key={repair.repair_id} className="border-t border-slate-100">
                  <td className="p-3">{repair.repair_id}</td>
                  <td className="p-3">{repair.room?.room_number}</td>
                  <td className="p-3">{showDate(repair.request_date)}</td>
                  <td className="p-3">{repair.description}</td>
                  <td className="p-3">{repair.staff ? repair.staff.full_name : '-'}</td>
                  <td className="p-3">
                    <Badge value={repair.status} />
                  </td>
                  {isStaff && (
                    <td className="space-x-3 whitespace-nowrap p-3 text-right">
                      <button
                        onClick={() => openForm(repair)}
                        className="text-slate-600 hover:underline"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(repair)}
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
