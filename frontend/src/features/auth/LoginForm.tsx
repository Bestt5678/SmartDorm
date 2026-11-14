import { useState } from 'react'
import { errorMessage } from '../../api/apiClient'
import { Button, Field, inputCls } from '../../components/SharedUI'
import { ROLE_LABEL, type Role } from '../../userTypes'
import AuthHeader from './AuthModalHeader'
import { useAuth } from './AuthContext'

const roles: Role[] = ['TENANT', 'STAFF', 'ADMIN']
const hint = {
  TENANT: 'ดูใบแจ้งหนี้ จองห้อง และแจ้งซ่อมห้องของคุณ',
  STAFF: 'จัดการการจอง ใบแจ้งหนี้ และงานซ่อม',
  ADMIN: 'ดูแลระบบและเจ้าหน้าที่ทั้งหมด',
}

export default function LoginForm({
  onSuccess,
  onSwitch,
  onClose,
}: {
  onSuccess: () => void
  onSwitch: () => void
  onClose: () => void
}) {
  const { login } = useAuth()
  const [role, setRole] = useState<Role>('TENANT')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<any>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const newErrors: any = {}
    if (email.trim() === '') newErrors.email = 'กรอกอีเมล'
    else if (!email.includes('@')) newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง'
    if (password.length < 6) newErrors.password = 'รหัสผ่านอย่างน้อย 6 ตัวอักษร'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setLoading(true)
    setServerError('')
    try {
      await login(email.trim(), password, role)
      onSuccess()
    } catch (err) {
      setServerError(errorMessage(err))
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthHeader title="เข้าสู่ระบบ" subtitle={hint[role]} onClose={onClose} />

      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            onClick={() => {
              setRole(r)
              setServerError('')
            }}
            className={`rounded-lg py-1.5 text-sm font-medium ${
              role === r ? 'bg-white text-accent shadow-sm' : 'text-slate-600'
            }`}
          >
            {ROLE_LABEL[r]}
          </button>
        ))}
      </div>

      <Field label="อีเมล" error={errors.email}>
        <input
          className={inputCls}
          autoFocus
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="รหัสผ่าน" error={errors.password}>
        <input
          className={inputCls}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {serverError}
        </p>
      )}
      <Button disabled={loading} className="w-full">
        {loading ? 'กำลังดำเนินการ…' : 'เข้าสู่ระบบในฐานะ' + ROLE_LABEL[role]}
      </Button>

      {role === 'TENANT' ? (
        <p className="text-center text-sm text-slate-600">
          ยังไม่มีบัญชี?{' '}
          <button type="button" className="font-medium text-accent underline" onClick={onSwitch}>
            สมัครสมาชิก
          </button>
        </p>
      ) : (
        <p className="text-center text-xs text-slate-500">
          พนักงานและผู้ดูแลเข้าสู่ระบบด้วยอีเมลเท่านั้น
        </p>
      )}
    </form>
  )
}
