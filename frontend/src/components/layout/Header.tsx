import { useAuth } from '../../features/auth/AuthContext'
import { ROLE_LABEL } from '../../userTypes'

export default function Header({
  menu,
  currentPage,
  onSelect,
  onLogin,
  onLogout,
}: {
  menu: { key: string; title: string }[]
  currentPage: string
  onSelect: (key: string) => void
  onLogin: () => void
  onLogout: () => void
}) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 p-4">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">S</span>
          SmartDorm
        </h1>

        {user ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">
              {user.name}
              <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                {ROLE_LABEL[user.role]}
              </span>
            </span>
            <button
              onClick={onLogout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100"
            >
              ออกจากระบบ
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:brightness-110"
          >
            เข้าสู่ระบบ / สมัครสมาชิก
          </button>
        )}
      </div>

      {user && (
        <nav
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3"
          aria-label="เมนูหลัก"
        >
          {menu.map((e) => (
            <button
              key={e.key}
              onClick={() => onSelect(e.key)}
              aria-current={currentPage === e.key ? 'page' : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                currentPage === e.key ? 'bg-accent text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {e.title}
            </button>
          ))}
        </nav>
      )}
    </header>
  )
}
