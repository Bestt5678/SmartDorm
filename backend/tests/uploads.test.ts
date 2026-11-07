import fs from 'node:fs'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { uploadDir } from '../src/lib/upload'
import { bearer, loginAs } from './helpers/auth'
import { seedBase, seedContractWithInvoice } from './helpers/fixtures'

const pngBuffer = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
])

function uploadedFiles() {
  return fs.readdirSync(uploadDir)
}

function upload(
  invoiceId: number,
  token: string,
  options: {
    amount?: string
    buffer?: Buffer
    filename?: string
    contentType?: string
  } = {},
) {
  let agent = request(app)
    .post(`/api/invoices/${invoiceId}/payments`)
    .set(bearer(token))
    .field('amount', options.amount ?? '500')
    .field('paymentType', 'โอนเงิน')

  if (options.buffer) {
    agent = agent.attach('slip', options.buffer, {
      filename: options.filename ?? 'slip.png',
      contentType: options.contentType ?? 'image/png',
    })
  }

  return agent
}

describe('การจัดการไฟล์สลิป', () => {
  let tenantToken: string
  let otherTenantToken: string
  let invoiceId: number

  beforeEach(async () => {
    const base = await seedBase()
    const contractData = await seedContractWithInvoice(base, { total: 1000 })
    invoiceId = contractData.invoice.invoiceId
    tenantToken = await loginAs('tenant@test.local')
    otherTenantToken = await loginAs('tenant2@test.local')
  })

  it('ลบไฟล์เมื่อเนื้อหาไม่ตรงกับชนิดไฟล์', async () => {
    const response = await upload(invoiceId, tenantToken, {
      buffer: Buffer.from('not-a-real-png'),
    })

    expect(response.status).toBe(400)
    expect(response.body.message).toContain('ไฟล์สลิปไม่ถูกต้อง')
    expect(uploadedFiles()).toHaveLength(0)
  })

  it('ลบไฟล์เมื่อยอดชำระเกินคงเหลือ', async () => {
    const response = await upload(invoiceId, tenantToken, {
      amount: '1200',
      buffer: pngBuffer,
    })

    expect(response.status).toBe(400)
    expect(response.body.message).toContain('เกินยอดคงเหลือ')
    expect(uploadedFiles()).toHaveLength(0)
  })

  it('ลบไฟล์เมื่อข้อมูลที่ส่งมาไม่ผ่าน validation', async () => {
    const response = await upload(invoiceId, tenantToken, {
      amount: '0',
      buffer: pngBuffer,
    })

    expect(response.status).toBe(400)
    expect(uploadedFiles()).toHaveLength(0)
  })

  it('ลบไฟล์เมื่อผู้ใช้ไม่มีสิทธิ์ชำระใบแจ้งหนี้นี้', async () => {
    const response = await upload(invoiceId, otherTenantToken, {
      buffer: pngBuffer,
    })

    expect(response.status).toBe(403)
    expect(uploadedFiles()).toHaveLength(0)
  })

  it('เก็บไฟล์ไว้เมื่ออัปโหลดสำเร็จ', async () => {
    const response = await upload(invoiceId, tenantToken, {
      buffer: pngBuffer,
    })

    expect(response.status).toBe(201)
    expect(uploadedFiles()).toHaveLength(1)
    expect(uploadedFiles()[0]).toMatch(/^slip-.*\.png$/)
  })

  it('ปฏิเสธไฟล์ชนิดที่ไม่รองรับโดยไม่บันทึกไฟล์', async () => {
    const response = await upload(invoiceId, tenantToken, {
      buffer: Buffer.from('%PDF-1.4'),
      filename: 'slip.exe',
      contentType: 'application/x-msdownload',
    })

    expect(response.status).toBe(400)
    expect(uploadedFiles()).toHaveLength(0)
  })
})
