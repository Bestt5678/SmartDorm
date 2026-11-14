import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/apiClient'
import { Button, Field, inputCls, Message, State } from '../components/SharedUI'
import { showDate } from '../lib/moneyAndDate'

const emptyForm = { full_name: '', id_card_no: '', phone: '', email: '' }

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([])
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
        const res = await api.get('/tenants')
        setTenants(res.data)
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

  function openForm(tenant: any) {
    if (tenant) {
      setForm({
        full_name: tenant.full_name,
        id_card_no: tenant.id_card_no || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
      })
      setEditId(tenant.tenant_id)
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
    if (!/^\d{13}$/.test(form.id_card_no)) newErrors.id_card_no = 'เลขบัตรประชาชนต้องมี 13 หลัก'
    if (form.phone !== '' && !/^\d{9,10}$/.test(form.phone))
      newErrors.phone = 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก'
    if (form.email !== '' && !form.email.includes('@')) newErrors.email = 'อีเมลไม่ถูกต้อง'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      if (editId) {
        await api.patch('/tenants/' + editId, form)
      } else {
        await api.post('/tenants', form)
      }
      showSuccess('บันทึกแล้ว')
      setShowForm(false)
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  async function handleDelete(tenant: any) {
    if (!confirm('ลบผู้เช่า ' + tenant.full_name + '?')) return
    try {
      await api.delete('/tenants/' + tenant.tenant_id)
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
          <h2 className="text-lg font-semibold">ผู้เช่า</h2>
          <p className="text-sm text-slate-500">
            เพิ่มผู้เช่าที่ติดต่อหน้าหอ (walk-in) ได้ ผู้เช่าที่สมัครออนไลน์จะมีบัญชีเข้าสู่ระบบด้วย
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
            {editId ? 'แก้ไขผู้เช่า' : 'เพิ่มผู้เช่า'}
          </h3>
          <Field label="ชื่อ-นามสกุล" error={errors.full_name}>
            <input
              className={inputCls}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </Field>
          <Field label="เลขบัตรประชาชน" error={errors.id_card_no}>
            <input
              className={inputCls}
              value={form.id_card_no}
              onChange={(e) => setForm({ ...form, id_card_no: e.target.value })}
            />
          </Field>
          <Field label="เบอร์โทร" error={errors.phone}>
            <input
              className={inputCls}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="อีเมล" error={errors.email}>
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
        empty={tenants.length === 0}
        onRetry={() => setReload(reload + 1)}
      />

      {tenants.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">ชื่อ-นามสกุล</th>
                <th className="p-3">เบอร์โทร</th>
                <th className="p-3">อีเมล</th>
                <th className="p-3">บัญชี</th>
                <th className="p-3">บันทึกเมื่อ</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.tenant_id} className="border-t border-slate-100">
                  <td className="p-3">{tenant.tenant_id}</td>
                  <td className="p-3">{tenant.full_name}</td>
                  <td className="p-3">{tenant.phone || '-'}</td>
                  <td className="p-3">{tenant.email || '-'}</td>
                  <td className="p-3">{tenant.account ? 'มีบัญชี' : '-'}</td>
                  <td className="p-3">{showDate(tenant.created_at)}</td>
                  <td className="space-x-3 whitespace-nowrap p-3 text-right">
                    <button
                      onClick={() => openForm(tenant)}
                      className="text-slate-600 hover:underline"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(tenant)}
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
