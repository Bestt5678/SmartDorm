import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import { MulterError } from 'multer'
import { env } from './config/env'
import { apiRouter } from './routes/apiRouter'

export const app = express()

app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', apiRouter)

app.use((req, res) => {
  res.status(404).json({ message: 'ไม่พบหน้าที่ต้องการ' })
})

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)' })
    }
    return res.status(400).json({ message: 'อัปโหลดไฟล์ไม่สำเร็จ' })
  }
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ message: err.message })
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'ข้อมูลนี้มีอยู่แล้วในระบบ' })
  }
  if (err.code === 'P2003') {
    return res
      .status(409)
      .json({ message: 'ไม่สามารถดำเนินการได้ เนื่องจากมีข้อมูลที่อ้างอิงอยู่' })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'ไม่พบข้อมูลที่ต้องการ' })
  }
  console.log(err)
  res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' })
})
