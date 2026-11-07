import { useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import LoginModal from "../features/auth/LoginModal";
import { ROLE_LABEL } from "../features/auth/schema";
import HomePage from "../features/home/HomePage";
import { CONTACT, telHref } from "../config/site";
import ResourcePage from "../components/ResourcePage";
import { entriesFor, type Entry } from "../features/registry";

function Page({ entry }: { entry: Entry }) {
  const { user } = useAuth();
  if ("component" in entry) {
    const Component = entry.component;
    return <Component />;
  }
  const mode = user ? entry.access[user.role] : undefined;
  return mode ? <ResourcePage key={entry.key} config={entry.config} mode={mode} /> : null;
}

export default function App() {
  const { user, logout, oauthError, clearOAuthError } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const visible = user ? entriesFor(user.role) : [];
  const current = visible.find((e) => e.key === active) ?? visible[0];
  const needsProfile = user?.role === "TENANT" && user.profile_complete === false;

  function signOut() {
    logout();
    setActive(null);
  }

  return (
    <div className="min-h-screen">
      <div className="bg-ink px-4 py-1.5 text-center text-xs text-white/85">
        ติดต่อ{CONTACT.role} {CONTACT.name}:{" "}
        <a href={telHref} className="font-semibold text-amber-200 underline">{CONTACT.phone}</a>
      </div>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 p-4">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">S</span>
            SmartDorm
          </h1>

          {/* มุมขวาบน: ปุ่มเข้าสู่ระบบ / ข้อมูลผู้ใช้ */}
          {user ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden sm:inline">
                {user.name}
                <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  {ROLE_LABEL[user.role]}
                </span>
              </span>
              <button onClick={signOut}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100">
                ออกจากระบบ
              </button>
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:brightness-110">
              เข้าสู่ระบบ / สมัครสมาชิก
            </button>
          )}
        </div>

        {user && (
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3" aria-label="เมนูหลัก">
            {visible.map((e) => (
              <button key={e.key} onClick={() => setActive(e.key)}
                aria-current={current?.key === e.key ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                  current?.key === e.key ? "bg-accent text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                {e.title}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl p-4">
        {oauthError && (
          <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <span>เข้าสู่ระบบผ่านบัญชีโซเชียลไม่สำเร็จ: {oauthError}</span>
            <button onClick={clearOAuthError} className="font-medium underline">ปิด</button>
          </div>
        )}
        {needsProfile && current?.key !== "profile" && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <span>กรุณากรอกเลขบัตรประชาชนในข้อมูลส่วนตัวก่อนจองห้องพัก</span>
            <button onClick={() => setActive("profile")} className="font-medium underline">ไปที่ข้อมูลส่วนตัว</button>
          </div>
        )}
        {user && current ? <Page key={current.key} entry={current} /> : <HomePage onLogin={() => setShowLogin(true)} />}
      </main>

      <footer className="mt-12 border-t border-slate-200 p-6 text-center text-sm text-slate-500">
        © SmartDorm · ติดต่อ{CONTACT.role}{" "}
        <a href={telHref} className="font-medium text-accent">{CONTACT.phone}</a>
      </footer>

      {showLogin && !user && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
