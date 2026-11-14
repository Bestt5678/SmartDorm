import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/apiClient'
import { Badge, Button, Field, inputCls, Message, State } from '../components/SharedUI'
import { useAuth } from '../features/auth/AuthContext'
import { money, showDate } from '../lib/moneyAndDate'

const INVOICE_TYPES: any = {
  RENT: 'ค่าเช่า',
  UTILITY: 'ค่าน้ำ-ไฟ',
  DEPOSIT: 'เงินมัดจำ',
  OTHER: 'อื่นๆ',
}
const PAYMENT_TYPES = ['เงินสด', 'โอนเงิน', 'บัตรเครดิต', 'พร้อมเพย์']

const emptyForm = {
  contract_id: '',
  meter_id: '',
  invoice_type: 'RENT',
  due_date: '',
  rent_amount: '0',
  water_amount: '0',
  electric_amount: '0',
}

export default function InvoicesPage() {
  const { user } = useAuth()
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN'

  const [invoices, setInvoices] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [meters, setMeters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<any>({})

  const [payInvoice, setPayInvoice] = useState<any>(null)
  const [payForm, setPayForm] = useState({ amount: '', payment_type: 'โอนเงิน' })
  const [slip, setSlip] = useState<File | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/invoices')
        setInvoices(res.data)
        if (isStaff) {
          const contractRes = await api.get('/contracts')
          setContracts(contractRes.data)
          const meterRes = await api.get('/utility-meters')
          setMeters(meterRes.data)
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

  function openForm(invoice: any) {
    if (invoice) {
      setForm({
        ...emptyForm,
        due_date: showDate(invoice.due_date),
        rent_amount: String(invoice.rent_amount),
        water_amount: String(invoice.water_amount),
        electric_amount: String(invoice.electric_amount),
      })
      setEditId(invoice.invoice_id)
    } else {
      setForm(emptyForm)
      setEditId(null)
    }
    setErrors({})
    setPayInvoice(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const newErrors: any = {}
    if (!editId && form.contract_id === '') newErrors.contract_id = 'เลือกสัญญา'
    if (form.due_date === '') newErrors.due_date = 'เลือกวันที่'
    if (form.rent_amount === '' || Number(form.rent_amount) < 0) newErrors.rent_amount = 'ห้ามติดลบ'
    if (form.water_amount === '' || Number(form.water_amount) < 0)
      newErrors.water_amount = 'ห้ามติดลบ'
    if (form.electric_amount === '' || Number(form.electric_amount) < 0)
      newErrors.electric_amount = 'ห้ามติดลบ'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      if (editId) {
        await api.patch('/invoices/' + editId, {
          due_date: form.due_date,
          rent_amount: form.rent_amount,
          water_amount: form.water_amount,
          electric_amount: form.electric_amount,
        })
      } else {
        await api.post('/invoices', form)
      }
      showSuccess('บันทึกแล้ว')
      setShowForm(false)
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  async function handleDelete(invoice: any) {
    if (!confirm('ลบรายการนี้?')) return
    try {
      await api.delete('/invoices/' + invoice.invoice_id)
      showSuccess('ลบแล้ว')
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  async function handleCancel(invoice: any) {
    if (!confirm('ยกเลิกใบแจ้งหนี้นี้? (ทำได้เมื่อไม่มีรายการชำระที่รอตรวจสอบหรืออนุมัติแล้ว)'))
      return
    try {
      await api.post('/invoices/' + invoice.invoice_id + '/cancel')
      showSuccess('ยกเลิกใบแจ้งหนี้แล้ว')
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  function openPayForm(invoice: any) {
    setShowForm(false)
    setPayInvoice(invoice)
    setPayForm({ amount: String(invoice.balance), payment_type: 'โอนเงิน' })
    setSlip(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!slip) {
      showError({ message: 'กรุณาแนบสลิปการชำระเงิน' })
      return
    }

    const data = new FormData()
    data.append('amount', payForm.amount)
    data.append('payment_type', payForm.payment_type)
    data.append('slip', slip)

    try {
      await api.post('/invoices/' + payInvoice.invoice_id + '/payments', data)
      setPayInvoice(null)
      showSuccess('ส่งสลิปแล้ว รอเจ้าหน้าที่ตรวจสอบ')
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">ใบแจ้งหนี้</h2>
          <p className="text-sm text-slate-500">
            สถานะคำนวณจากยอดที่ชำระแล้วอัตโนมัติ ถ้าเลือกรอบมิเตอร์
            ระบบจะคิดค่าน้ำ-ไฟให้ตามอัตราที่ตั้งไว้
          </p>
        </div>
        {isStaff && (
          <Button type="button" onClick={() => (showForm ? setShowForm(false) : openForm(null))}>
            {showForm ? 'ปิดฟอร์ม' : '+ ออกใบแจ้งหนี้'}
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
        >
          <h3 className="font-semibold sm:col-span-2">
            {editId ? 'แก้ไขใบแจ้งหนี้ #' + editId : 'ออกใบแจ้งหนี้'}
          </h3>
          {!editId && (
            <>
              <Field label="สัญญา" error={errors.contract_id}>
                <select
                  className={inputCls}
                  value={form.contract_id}
                  onChange={(e) => setForm({ ...form, contract_id: e.target.value })}
                >
                  <option value="">เลือก…</option>
                  {contracts.map((c) => (
                    <option key={c.contract_id} value={c.contract_id}>
                      สัญญา #{c.contract_id} ห้อง {c.booking?.room?.room_number}{' '}
                      {c.booking?.tenant?.full_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="รอบมิเตอร์ (ถ้ามี)">
                <select
                  className={inputCls}
                  value={form.meter_id}
                  onChange={(e) => setForm({ ...form, meter_id: e.target.value })}
                >
                  <option value="">เลือก…</option>
                  {meters.map((m) => (
                    <option key={m.meter_id} value={m.meter_id}>
                      ห้อง {m.room?.room_number} เดือน {String(m.meter_month).slice(0, 7)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="ประเภท">
                <select
                  className={inputCls}
                  value={form.invoice_type}
                  onChange={(e) => setForm({ ...form, invoice_type: e.target.value })}
                >
                  {Object.keys(INVOICE_TYPES).map((type) => (
                    <option key={type} value={type}>
                      {INVOICE_TYPES[type]}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <Field label="วันครบกำหนด" error={errors.due_date}>
            <input
              type="date"
              className={inputCls}
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </Field>
          <Field label="ค่าเช่า" error={errors.rent_amount}>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={form.rent_amount}
              onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
            />
          </Field>
          <Field label="ค่าน้ำ" error={errors.water_amount}>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={form.water_amount}
              onChange={(e) => setForm({ ...form, water_amount: e.target.value })}
            />
          </Field>
          <Field label="ค่าไฟ" error={errors.electric_amount}>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={form.electric_amount}
              onChange={(e) => setForm({ ...form, electric_amount: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Button>บันทึก</Button>
          </div>
        </form>
      )}

      {payInvoice && (
        <form
          onSubmit={handlePay}
          className="mb-6 grid gap-3 rounded-xl border border-accent/40 bg-white p-4 sm:grid-cols-2"
        >
          <h3 className="font-semibold sm:col-span-2">
            ชำระเงิน ใบแจ้งหนี้ #{payInvoice.invoice_id} (ห้อง{' '}
            {payInvoice.contract?.booking?.room?.room_number})
          </h3>
          <Field label="จำนวนเงิน">
            <input
              type="number"
              step="any"
              required
              className={inputCls}
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
            />
          </Field>
          <Field label="ช่องทางชำระ">
            <select
              className={inputCls}
              value={payForm.payment_type}
              onChange={(e) => setPayForm({ ...payForm, payment_type: e.target.value })}
            >
              {PAYMENT_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </Field>
          <Field label="สลิป (JPG, PNG, WEBP หรือ PDF ไม่เกิน 5MB)">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className={inputCls}
              onChange={(e) => setSlip(e.target.files ? e.target.files[0] : null)}
            />
          </Field>
          <div className="space-x-2 sm:col-span-2">
            <Button>ยืนยัน</Button>
            <button
              type="button"
              onClick={() => setPayInvoice(null)}
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
        empty={invoices.length === 0}
        onRetry={() => setReload(reload + 1)}
      />

      {invoices.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">ห้อง</th>
                <th className="p-3">ประเภท</th>
                <th className="p-3">ครบกำหนด</th>
                <th className="p-3">ยอดรวม</th>
                <th className="p-3">ชำระแล้ว</th>
                <th className="p-3">คงเหลือ</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.invoice_id} className="border-t border-slate-100">
                  <td className="p-3">{invoice.invoice_id}</td>
                  <td className="p-3">{invoice.contract?.booking?.room?.room_number}</td>
                  <td className="p-3">{INVOICE_TYPES[invoice.invoice_type]}</td>
                  <td className="p-3">{showDate(invoice.due_date)}</td>
                  <td className="p-3">{money(invoice.total_amount)}</td>
                  <td className="p-3">{money(invoice.paid_amount)}</td>
                  <td className="p-3">{money(invoice.balance)}</td>
                  <td className="p-3">
                    <Badge value={invoice.status} />
                  </td>
                  <td className="space-x-3 whitespace-nowrap p-3 text-right">
                    {user?.role === 'TENANT' &&
                      ['ค้างชำระ', 'ชำระบางส่วน', 'เกินกำหนด'].includes(invoice.status) && (
                        <button
                          onClick={() => openPayForm(invoice)}
                          className="font-medium text-accent hover:underline"
                        >
                          ชำระเงิน / แนบสลิป
                        </button>
                      )}
                    {isStaff && invoice.status !== 'ชำระแล้ว' && invoice.status !== 'ยกเลิก' && (
                      <button
                        onClick={() => handleCancel(invoice)}
                        className="font-medium text-red-700 hover:underline"
                      >
                        ยกเลิกใบแจ้งหนี้
                      </button>
                    )}
                    {isStaff && (
                      <>
                        <button
                          onClick={() => openForm(invoice)}
                          className="text-slate-600 hover:underline"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDelete(invoice)}
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
