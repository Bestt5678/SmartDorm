import { todayThai } from './thaiDate'

// นับเฉพาะการชำระที่ "อนุมัติแล้ว"
export function calcInvoice(invoice: any) {
  const total =
    Number(invoice.rent_amount) +
    Number(invoice.water_amount) +
    Number(invoice.electric_amount) +
    Number(invoice.deposit_amount)

  let paid = 0
  for (const payment of invoice.payments || []) {
    if (payment.status === 'อนุมัติแล้ว') {
      paid += Number(payment.amount)
    }
  }

  let balance = total - paid
  if (balance < 0) balance = 0

  // "เกินกำหนด" ไม่ได้เก็บใน DB แต่คำนวณตอนแสดงผล
  let status = invoice.status
  if (status === 'ค้างชำระ' && invoice.due_date < todayThai()) {
    status = 'เกินกำหนด'
  }

  return {
    ...invoice,
    total_amount: Number(total.toFixed(2)),
    paid_amount: Number(paid.toFixed(2)),
    balance: Number(balance.toFixed(2)),
    status: status,
  }
}
