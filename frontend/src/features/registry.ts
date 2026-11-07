import type { ComponentType } from "react";
import type { Mode, ResourceConfig } from "../components/ResourcePage";
import type { Role } from "./auth/schema";
import { bookingConfig } from "./booking/config";
import { contractConfig } from "./contract/config";
import DashboardPage from "./dashboard/DashboardPage";
import { invoiceConfig } from "./invoice/config";
import { paymentConfig } from "./payment/config";
import ProfilePage from "./profile/ProfilePage";
import { repairRequestConfig } from "./repair-request/config";
import { roomTypeConfig } from "./room-type/config";
import { roomConfig } from "./room/config";
import { staffConfig } from "./staff/config";
import { tenantConfig } from "./tenant/config";
import { utilityMeterConfig } from "./utility-meter/config";

type Access = Partial<Record<Role, Mode>>;

/** เมนูหนึ่งรายการ: หน้าตารางจาก config หรือหน้าที่เขียนเอง (เช่น dashboard) */
export type Entry =
  | { key: string; title: string; config: ResourceConfig; access: Access }
  | { key: string; title: string; component: ComponentType; roles: Role[] };

const manage: Access = { STAFF: "full", ADMIN: "full" };
const resource = (config: ResourceConfig, access: Access): Entry => ({
  key: config.endpoint,
  title: config.title,
  config,
  access,
});

// ทั้ง 10 ตารางของ SmartDorm + หน้าพิเศษ — บทบาทที่ไม่อยู่ใน access/roles จะไม่เห็นเมนูนั้น
// ผู้เช่าเห็นเฉพาะข้อมูลของตัวเอง (backend กรองให้)
export const registry: Entry[] = [
  { key: "dashboard", title: "ภาพรวม", component: DashboardPage, roles: ["STAFF", "ADMIN"] },
  resource(roomConfig, { TENANT: "read", ...manage }),
  resource(roomTypeConfig, manage),
  resource(tenantConfig, manage),
  resource(bookingConfig, { TENANT: "create", ...manage }),
  resource(contractConfig, { TENANT: "read", ...manage }),
  resource(utilityMeterConfig, manage),
  resource(invoiceConfig, { TENANT: "read", ...manage }),
  resource(paymentConfig, { TENANT: "read", ...manage }),
  resource(repairRequestConfig, { TENANT: "create", ...manage }),
  resource(staffConfig, { ADMIN: "full" }),
  { key: "profile", title: "ข้อมูลส่วนตัว", component: ProfilePage, roles: ["TENANT"] },
];

export function entriesFor(role: Role) {
  return registry.filter((e) => ("config" in e ? Boolean(e.access[role]) : e.roles.includes(role)));
}
