import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, post } from "../../api/client";
import { LoginResponseSchema, UserSchema, type LoginForm, type RegisterForm, type User } from "./schema";

type AuthValue = {
  user: User | null;
  login: (form: LoginForm) => Promise<void>;
  register: (form: RegisterForm) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

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

  const value = useMemo(
    () => ({ user, login, register, refresh, logout }),
    [user, login, register, refresh, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook คู่กับ provider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ต้องอยู่ภายใน AuthProvider");
  return ctx;
}
