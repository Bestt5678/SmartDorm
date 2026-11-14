import { useState } from 'react'
import { api, errorMessage } from '../../api/apiClient'
import { Button, Field, inputCls, Message } from '../../components/SharedUI'
import { useAuth } from '../auth/AuthContext'

export default function ProfilePage() {
  const { user, refresh } = useAuth()
  const [fullName, setFullName] = useState(user?.name || '')
  const [idCardNo, setIdCardNo] = useState('')
  const [phone, setPhone] = useState(user?.phone || '')
  const [errors, setErrors] = useState<any>({})
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    const newErrors: any = {}
    if (fullName.trim().length < 2) newErrors.full_name = 'กรอกชื่ออย่างน้อย 2 ตัวอักษร'
    if (idCardNo !== '' && !/^\d{13}$/.test(idCardNo))
      newErrors.id_card_no = 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก'
    if (phone !== '' && !/^\d{9,10}$/.test(phone))
      newErrors.phone = 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    const data: any = { full_name: fullName.trim(), phone: phone }
    if (idCardNo !== '') data.id_card_no = idCardNo

    setSaving(true)
    try {
      await api.patch('/auth/me', data)
      await refresh()
      setIdCardNo('')
      setMessage('บันทึกข้อมูลแล้ว')
      setIsError(false)
    } catch (err) {
      setMessage(errorMessage(err))
      setIsError(true)
    }
    setSaving(false)
  }

  return (
    <section className="max-w-lg">
      <h2 className="text-lg font-semibold">ข้อมูลส่วนตัว</h2>
      <p className="mb-4 text-sm text-slate-500">อีเมล: {user?.email}</p>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <Field label="ชื่อ-นามสกุล" error={errors.full_name}>
          <input
            className={inputCls}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </Field>
        <Field label="เลขบัตรประชาชน (กรอกเฉพาะเมื่อต้องการแก้ไข)" error={errors.id_card_no}>
          <input
            className={inputCls}
            inputMode="numeric"
            value={idCardNo}
            onChange={(e) => setIdCardNo(e.target.value)}
          />
        </Field>
        <Field label="เบอร์โทร" error={errors.phone}>
          <input
            className={inputCls}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Message text={message} error={isError} />
        <Button disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
      </form>
    </section>
  )
}
