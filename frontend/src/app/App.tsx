import { useState } from 'react'
import ContactBar from '../components/layout/ContactBar'
import Footer from '../components/layout/Footer'
import Header from '../components/layout/Header'
import { useAuth } from '../features/auth/AuthContext'
import AuthModal from '../features/auth/AuthModal'
import DashboardPage from '../features/dashboard/DashboardPage'
import HomePage from '../features/home/HomePage'
import ProfilePage from '../features/profile/ProfilePage'
import BookingsPage from '../pages/BookingsPage'
import ContractsPage from '../pages/ContractsPage'
import InvoicesPage from '../pages/InvoicesPage'
import MetersPage from '../pages/MetersPage'
import PaymentsPage from '../pages/PaymentsPage'
import RepairsPage from '../pages/RepairsPage'
import RoomTypesPage from '../pages/RoomTypesPage'
import RoomsPage from '../pages/RoomsPage'
import StaffPage from '../pages/StaffPage'
import TenantsPage from '../pages/TenantsPage'

const MENU = [
  { key: 'dashboard', title: 'ภาพรวม', roles: ['STAFF', 'ADMIN'] },
  { key: 'rooms', title: 'ห้องพัก', roles: ['TENANT', 'STAFF', 'ADMIN'] },
  { key: 'room-types', title: 'ประเภทห้อง', roles: ['STAFF', 'ADMIN'] },
  { key: 'tenants', title: 'ผู้เช่า', roles: ['STAFF', 'ADMIN'] },
  { key: 'bookings', title: 'การจอง', roles: ['TENANT', 'STAFF', 'ADMIN'] },
  { key: 'contracts', title: 'สัญญาเช่า', roles: ['TENANT', 'STAFF', 'ADMIN'] },
  { key: 'meters', title: 'มิเตอร์น้ำ-ไฟ', roles: ['STAFF', 'ADMIN'] },
  { key: 'invoices', title: 'ใบแจ้งหนี้', roles: ['TENANT', 'STAFF', 'ADMIN'] },
  { key: 'payments', title: 'การชำระเงิน', roles: ['TENANT', 'STAFF', 'ADMIN'] },
  { key: 'repairs', title: 'แจ้งซ่อม', roles: ['TENANT', 'STAFF', 'ADMIN'] },
  { key: 'staff', title: 'พนักงาน', roles: ['ADMIN'] },
  { key: 'profile', title: 'ข้อมูลส่วนตัว', roles: ['TENANT'] },
]

function showPage(key: string) {
  switch (key) {
    case 'dashboard':
      return <DashboardPage />
    case 'rooms':
      return <RoomsPage />
    case 'room-types':
      return <RoomTypesPage />
    case 'tenants':
      return <TenantsPage />
    case 'bookings':
      return <BookingsPage />
    case 'contracts':
      return <ContractsPage />
    case 'meters':
      return <MetersPage />
    case 'invoices':
      return <InvoicesPage />
    case 'payments':
      return <PaymentsPage />
    case 'repairs':
      return <RepairsPage />
    case 'staff':
      return <StaffPage />
    case 'profile':
      return <ProfilePage />
    default:
      return null
  }
}

export default function App() {
  const { user, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [page, setPage] = useState('')

  const menu = user ? MENU.filter((item) => item.roles.includes(user.role)) : []

  let currentPage = page
  if (!menu.some((item) => item.key === page) && menu.length > 0) {
    currentPage = menu[0]!.key
  }

  function handleLogout() {
    logout()
    setPage('')
  }

  return (
    <div className="min-h-screen">
      <ContactBar />
      <Header
        menu={menu}
        currentPage={currentPage}
        onSelect={setPage}
        onLogin={() => setShowLogin(true)}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-6xl p-4">
        {user ? (
          <div key={currentPage}>{showPage(currentPage)}</div>
        ) : (
          <HomePage onLogin={() => setShowLogin(true)} />
        )}
      </main>

      <Footer />

      {showLogin && !user && <AuthModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}
