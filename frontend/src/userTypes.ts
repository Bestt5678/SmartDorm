export type Role = 'TENANT' | 'STAFF' | 'ADMIN'

export type User = {
  id: number
  name: string
  role: Role
  email: string
  phone: string | null
  tenant_id: number | null
  staff_id: number | null
}

export const ROLE_LABEL = {
  TENANT: 'ผู้เช่า',
  STAFF: 'พนักงาน',
  ADMIN: 'ผู้ดูแล',
}
