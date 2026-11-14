import { useState } from 'react'
import Modal from '../../components/Modal'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <Modal
      label={mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
      onClose={onClose}
      className="max-w-sm p-6"
    >
      {mode === 'login' ? (
        <LoginForm onSuccess={onClose} onClose={onClose} onSwitch={() => setMode('register')} />
      ) : (
        <RegisterForm onSuccess={onClose} onClose={onClose} onSwitch={() => setMode('login')} />
      )}
    </Modal>
  )
}
