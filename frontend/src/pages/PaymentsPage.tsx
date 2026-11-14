import { useEffect, useState } from 'react'
import { api, errorMessage, openSlip } from '../api/apiClient'
import { Badge, Button, Field, inputCls, Message, State } from '../components/SharedUI'
import { useAuth } from '../features/auth/AuthContext'
import { money, showDate } from '../lib/moneyAndDate'

const PAYMENT_TYPES = ['เงินสด', 'โอนเงิน', 'บัตรเครดิต', 'พร้อมเพย์']
const emptyForm = { invoice_id: '', amount: '', payment_type: 'เงินสด' }

export default function PaymentsPage() {
  const { user } = useAuth()
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN'

  const [payments, setPayments] = useState<any[]>([])
  const [openInvoices, setOpenInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<any>({})

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/payments')
        setPayments(res.data)
        if (isStaff) {
          const invoiceRes = await api.get('/invoices')
          setOpenInvoices(
            invoiceRes.data.filter((i: any) => i.status !== 'ชำระแล้ว' && i.status !== 'ยกเลิก'),
          )
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
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const newErrors: any = {}
    if (form.invoice_id === '') newErrors.invoice_id = 'เลือกใบแจ้งหนี้'
    if (form.amount === '' || Number(form.amount) <= 0) newErrors.amount = 'ยอดต้องมากกว่า 0'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      await api.post('/payments', form)
      showSuccess('บันทึกแล้ว')
      setShowForm(false)
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  async function handleViewSlip(payment: any) {
    try {
      await openSlip(payment.payment_id)
    } catch (err) {
      showError(err)
    }
  }

  async function handleApprove(payment: any) {
    if (!confirm('อนุมัติรายการชำระเงินนี้?')) return
    try {
      await api.post('/payments/' + payment.payment_id + '/approve')
      showSuccess('อนุมัติแล้ว')
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  async function handleReject(payment: any) {
    const note = prompt('เหตุผลที่ปฏิเสธ (ผู้เช่าจะเห็นข้อความนี้)')
    if (note === null) return
    try {
      await api.post('/payments/' + payment.payment_id + '/reject', { note: note })
      showSuccess('ปฏิเสธรายการแล้ว')
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  async function handleDelete(payment: any) {
    if (!confirm('ลบรายการนี้?')) return
    try {
      await api.delete('/payments/' + payment.payment_id)
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
          <h2 className="text-lg font-semibold">การชำระเงิน</h2>
          <p className="text-sm text-slate-500">
            ผู้เช่าแนบสลิปจากเมนูใบแจ้งหนี้ เจ้าหน้าที่ตรวจแล้วอนุมัติ/ปฏิเสธ
            หรือบันทึกรับเงินสดได้ที่นี่
          </p>
        </div>
        {isStaff && (
          <Button type="button" onClick={() => (showForm ? setShowForm(false) : openForm())}>
            {showForm ? 'ปิดฟอร์ม' : '+ บันทึกรับเงิน'}
          </Button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
        >
          <h3 className="font-semibold sm:col-span-2">บันทึกรับเงิน</h3>
          <Field label="ใบแจ้งหนี้ (ที่ยังชำระไม่ครบ)" error={errors.invoice_id}>
            <select
              className={inputCls}
              value={form.invoice_id}
              onChange={(e) => setForm({ ...form, invoice_id: e.target.value })}
            >
              <option value="">เลือก…</option>
              {openInvoices.map((invoice) => (
                <option key={invoice.invoice_id} value={invoice.invoice_id}>
                  ใบแจ้งหนี้ #{invoice.invoice_id} คงเหลือ {money(invoice.balance)} บาท
                </option>
              ))}
            </select>
          </Field>
          <Field label="จำนวนเงิน" error={errors.amount}>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="ช่องทางชำระ">
            <select
              className={inputCls}
              value={form.payment_type}
              onChange={(e) => setForm({ ...form, payment_type: e.target.value })}
            >
              {PAYMENT_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
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
        empty={payments.length === 0}
        onRetry={() => setReload(reload + 1)}
      />

      {payments.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">ใบแจ้งหนี้</th>
                <th className="p-3">ห้อง</th>
                <th className="p-3">วันที่ชำระ</th>
                <th className="p-3">จำนวนเงิน</th>
                <th className="p-3">ช่องทาง</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3">หมายเหตุ</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.payment_id} className="border-t border-slate-100">
                  <td className="p-3">{payment.payment_id}</td>
                  <td className="p-3">{payment.invoice_id}</td>
                  <td className="p-3">{payment.invoice?.contract?.booking?.room?.room_number}</td>
                  <td className="p-3">{showDate(payment.payment_date)}</td>
                  <td className="p-3">{money(payment.amount)}</td>
                  <td className="p-3">{payment.payment_type}</td>
                  <td className="p-3">
                    <Badge value={payment.status} />
                  </td>
                  <td className="p-3">{payment.note || '-'}</td>
                  <td className="space-x-3 whitespace-nowrap p-3 text-right">
                    {payment.slip_url && (
                      <button
                        onClick={() => handleViewSlip(payment)}
                        className="font-medium text-accent hover:underline"
                      >
                        ดูสลิป
                      </button>
                    )}
                    {isStaff && payment.status === 'รอตรวจสอบ' && (
                      <>
                        <button
                          onClick={() => handleApprove(payment)}
                          className="font-medium text-accent hover:underline"
                        >
                          อนุมัติ
                        </button>
                        <button
                          onClick={() => handleReject(payment)}
                          className="font-medium text-red-700 hover:underline"
                        >
                          ปฏิเสธ
                        </button>
                      </>
                    )}
                    {isStaff && (
                      <button
                        onClick={() => handleDelete(payment)}
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
