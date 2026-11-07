export const PROVIDERS = ["google", "line", "facebook"] as const;
export type Provider = (typeof PROVIDERS)[number];

/**
 * เริ่มล็อกอินผ่านบริการภายนอก: ส่งผู้ใช้ไป backend (/auth/<provider>) ให้ทำ OAuth
 * เสร็จแล้ว backend จะ redirect กลับมาที่ <เว็บ>/auth/callback?token=<JWT> (หรือ ?error=<ข้อความ>)
 * (โหมด mock จะข้ามขั้นตอนนี้และจำลองว่าล็อกอินสำเร็จ)
 */
export function startSocialLogin(provider: Provider) {
  if (import.meta.env.VITE_USE_MOCK === "true") {
    window.location.href = `/auth/callback?token=mock-${provider}`;
    return;
  }
  const api = import.meta.env.VITE_API_URL ?? "/api";
  window.location.href = `${api}/auth/${provider}`;
}
