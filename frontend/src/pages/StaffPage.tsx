import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/apiClient'
import { Button, Field, inputCls, Message, State } from '../components/SharedUI'

const emptyForm = { full_name: '', position: '', phone: '', email: '', password: '' }

export default function StaffPage() {
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
        const res = await api.get('/staff')
        setStaffList(res.data)
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

  function openForm(staff: any) {
    if (staff) {
      setForm({
        ...emptyForm,
        full_name: staff.full_name,
        position: staff.position,
        phone: staff.phone || '',
      })
      setEditId(staff.staff_id)
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
    if (form.full_name.trim().length < 2) newErrors.full_name = 'กรอกชื่ออย่างน้อย 2 ตัวอักษร'
    if (form.position.trim() === '') newErrors.position = 'กรอกตำแหน่ง'
    if (form.phone !== '' && !/^\d{9,10}$/.test(form.phone))
      newErrors.phone = 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก'
    if (!editId) {
      if (form.email !== '' && !form.email.includes('@')) newErrors.email = 'อีเมลไม่ถูกต้อง'
      if (form.password !== '' && form.password.length < 8)
        newErrors.password = 'รหัสผ่านอย่างน้อย 8 ตัวอักษร'
      // อีเมลกับรหัสผ่านต้องกรอกทั้งคู่ หรือเว้นว่างทั้งคู่
      else if ((form.email === '') !== (form.password === ''))
        newErrors.password = 'กรอกทั้งอีเมลและรหัสผ่าน หรือเว้นว่างทั้งคู่'
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      if (editId) {
        await api.patch('/staff/' + editId, {
          full_name: form.full_name,
          position: form.position,
          phone: form.phone,
        })
      } else {
        await api.post('/staff', form)
      }
      showSuccess('บันทึกแล้ว')
      setShowForm(false)
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  async function handleDelete(staff: any) {
    if (!confirm('ลบพนักงาน ' + staff.full_name + '?')) return
    try {
      await api.delete('/staff/' + staff.staff_id)
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
          <h2 className="text-lg font-semibold">พนักงาน</h2>
          <p className="text-sm text-slate-500">
            ใส่อีเมลและรหัสผ่านเพื่อสร้างบัญชีให้พนักงานเข้าสู่ระบบได้
            (เว้นว่างได้ถ้าไม่ต้องใช้ระบบ)
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
            {editId ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'}
          </h3>
          <Field label="ชื่อ-นามสกุล" error={errors.full_name}>
            <input
              className={inputCls}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </Field>
          <Field label="ตำแหน่ง" error={errors.position}>
            <input
              className={inputCls}
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </Field>
          <Field label="เบอร์โทร" error={errors.phone}>
            <input
              className={inputCls}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          {!editId && (
            <>
              <Field label="อีเมลสำหรับเข้าสู่ระบบ (ไม่บังคับ)" error={errors.email}>
                <input
                  type="email"
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="รหัสผ่าน (ไม่บังคับ)" error={errors.password}>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={inputCls}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
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
        empty={staffList.length === 0}
        onRetry={() => setReload(reload + 1)}
      />

      {staffList.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">ชื่อ-นามสกุล</th>
                <th className="p-3">ตำแหน่ง</th>
                <th className="p-3">เบอร์โทร</th>
                <th className="p-3">อีเมลเข้าสู่ระบบ</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr key={staff.staff_id} className="border-t border-slate-100">
                  <td className="p-3">{staff.staff_id}</td>
                  <td className="p-3">{staff.full_name}</td>
                  <td className="p-3">{staff.position}</td>
                  <td className="p-3">{staff.phone || '-'}</td>
                  <td className="p-3">{staff.account ? staff.account.email : '-'}</td>
                  <td className="space-x-3 whitespace-nowrap p-3 text-right">
                    <button
                      onClick={() => openForm(staff)}
                      className="text-slate-600 hover:underline"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(staff)}
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
