import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, post } from "../../api/client";
import { LoginResponseSchema, UserSchema, type LoginForm, type RegisterForm, type User } from "./schema";

type AuthValue = {
  user: User | null;
  /** ข้อความจากการเข้าสู่ระบบผ่าน Google/LINE/Facebook ที่ไม่สำเร็จ */
  oauthError: string | null;
  clearOAuthError: () => void;
  login: (form: LoginForm) => Promise<void>;
  register: (form: RegisterForm) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

/**
 * หน้า /auth/callback?token=... (หรือ ?error=...) ที่ backend redirect กลับมาหลัง OAuth
 * อ่านครั้งเดียวตอนโหลดหน้า แล้วล้าง URL ไม่ให้ token ค้างอยู่ใน address bar / history
 */
const oauthCallback = (() => {
  if (window.location.pathname !== "/auth/callback") return null;
  const params = new URLSearchParams(window.location.search);
  window.history.replaceState(null, "", "/");
  return { token: params.get("token"), error: params.get("error") };
})();

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    const parsed = raw ? UserSchema.safeParse(JSON.parse(raw)) : null;
    return parsed?.success && localStorage.getItem("token") ? parsed.data : null;
  } catch {
    return null;
  }
}

function saveSession(token: string, user: User) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);
  const [oauthError, setOAuthError] = useState<string | null>(oauthCallback?.error ?? null);

  const login = useCallback(async (form: LoginForm) => {
    const res = await post("/auth/login", form, LoginResponseSchema);
    saveSession(res.token, res.user);
    setUser(res.user);
  }, []);

  const register = useCallback(async (form: RegisterForm) => {
    const body = {
      full_name: form.full_name,
      id_card_no: form.id_card_no,
      phone: form.phone || undefined,
      email: form.email,
      password: form.password,
    };
    const res = await post("/auth/register", body, LoginResponseSchema);
    saveSession(res.token, res.user);
    setUser(res.user);
  }, []);

  // ใช้หลังล็อกอินผ่าน Google/LINE/Facebook: ได้ token มาแล้วไปขอข้อมูลผู้ใช้จาก /auth/me
  const loginWithToken = useCallback(async (token: string) => {
    localStorage.setItem("token", token);
    try {
      const { data } = await api.get("/auth/me");
      const u = UserSchema.parse(data);
      saveSession(token, u);
      setUser(u);
    } catch (e) {
      localStorage.removeItem("token");
      throw e;
    }
  }, []);

  // โหลดข้อมูลผู้ใช้ใหม่ (เช่น หลังแก้ข้อมูลส่วนตัว)
  const refresh = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    const u = UserSchema.parse(data);
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  // Axios interceptor ยิง event นี้เมื่อ token หมดอายุ (401)
  useEffect(() => {
    window.addEventListener("auth:logout", logout);
    return () => window.removeEventListener("auth:logout", logout);
  }, [logout]);

  // ได้ token จาก OAuth callback แล้ว ไปขอข้อมูลผู้ใช้ (setState เฉพาะใน callback ของ promise)
  useEffect(() => {
    const token = oauthCallback?.token;
    if (!token) return;
    localStorage.setItem("token", token);
    api
      .get("/auth/me")
      .then(({ data }) => {
        const u = UserSchema.parse(data);
        saveSession(token, u);
        setUser(u);
      })
      .catch(() => {
        localStorage.removeItem("token");
        setOAuthError("เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง");
      });
  }, []);

  const clearOAuthError = useCallback(() => setOAuthError(null), []);

  const value = useMemo(
    () => ({ user, oauthError, clearOAuthError, login, register, loginWithToken, refresh, logout }),
    [user, oauthError, clearOAuthError, login, register, loginWithToken, refresh, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook คู่กับ provider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ต้องอยู่ภายใน AuthProvider");
  return ctx;
}
