import { useState } from 'react'
import { errorMessage } from '../../api/apiClient'
import { Button, Field, inputCls } from '../../components/SharedUI'
import AuthHeader from './AuthModalHeader'
import { useAuth } from './AuthContext'

const emptyForm = {
  full_name: '',
  id_card_no: '',
  phone: '',
  email: '',
  password: '',
  confirm_password: '',
}

export default function RegisterForm({
  onSuccess,
  onSwitch,
  onClose,
}: {
  onSuccess: () => void
  onSwitch: () => void
  onClose: () => void
}) {
  const { register } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<any>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const newErrors: any = {}
    if (form.full_name.trim().length < 2)
      newErrors.full_name = 'กรอกชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษร'
    if (!/^\d{13}$/.test(form.id_card_no))
      newErrors.id_card_no = 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก'
    if (form.phone !== '' && !/^\d{9,10}$/.test(form.phone))
      newErrors.phone = 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก'
    if (form.email.trim() === '') newErrors.email = 'กรอกอีเมล'
    else if (!form.email.includes('@')) newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง'
    if (form.password.length < 8) newErrors.password = 'รหัสผ่านอย่างน้อย 8 ตัวอักษร'
    if (form.confirm_password === '') newErrors.confirm_password = 'ยืนยันรหัสผ่าน'
    else if (form.password !== form.confirm_password)
      newErrors.confirm_password = 'รหัสผ่านไม่ตรงกัน'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setLoading(true)
    setServerError('')
    try {
      await register({
        full_name: form.full_name.trim(),
        id_card_no: form.id_card_no,
        phone: form.phone,
        email: form.email.trim(),
        password: form.password,
      })
      onSuccess()
    } catch (err) {
      setServerError(errorMessage(err))
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthHeader
        title="สมัครสมาชิกผู้เช่า"
        subtitle="สร้างบัญชีเพื่อจองห้องและดูใบแจ้งหนี้ออนไลน์"
        onClose={onClose}
      />

      <Field label="ชื่อ-นามสกุล" error={errors.full_name}>
        <input
          className={inputCls}
          autoComplete="name"
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
      <Field label="เบอร์โทร (ไม่บังคับ)" error={errors.phone}>
        <input
          className={inputCls}
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </Field>
      <Field label="อีเมล" error={errors.email}>
        <input
          className={inputCls}
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </Field>
      <Field label="รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)" error={errors.password}>
        <input
          className={inputCls}
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </Field>
      <Field label="ยืนยันรหัสผ่าน" error={errors.confirm_password}>
        <input
          className={inputCls}
          type="password"
          autoComplete="new-password"
          value={form.confirm_password}
          onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
        />
      </Field>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {serverError}
        </p>
      )}
      <Button disabled={loading} className="w-full">
        {loading ? 'กำลังดำเนินการ…' : 'สมัครสมาชิก'}
      </Button>

      <p className="text-center text-sm text-slate-600">
        มีบัญชีแล้ว?{' '}
        <button type="button" className="font-medium text-accent underline" onClick={onSwitch}>
          เข้าสู่ระบบ
        </button>
      </p>
    </form>
  )
}
