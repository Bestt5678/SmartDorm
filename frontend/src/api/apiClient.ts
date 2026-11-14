import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = 'Bearer ' + token
  }
  return config
})

// token หมดอายุ → ออกจากระบบ (ยกเว้นตอนกด login เอง)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      !error.config.url.includes('/auth/login')
    ) {
      window.dispatchEvent(new Event('auth:logout'))
    }
    return Promise.reject(error)
  },
)

export function errorMessage(err: any): string {
  if (err.response && err.response.data && err.response.data.message) {
    return err.response.data.message
  }
  if (err.code === 'ERR_NETWORK') {
    return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า backend ทำงานอยู่'
  }
  return err.message || 'เกิดข้อผิดพลาด'
}

// เปิดสลิปในแท็บใหม่ ต้องโหลดเป็นไฟล์ก่อนเพราะต้องแนบ token ไปด้วย
export async function openSlip(paymentId: number) {
  const tab = window.open('', '_blank')
  try {
    const res = await api.get('/payments/' + paymentId + '/slip', { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    if (tab && !tab.closed) tab.location.href = url
    else window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (err) {
    if (tab) tab.close()
    throw err
  }
}
