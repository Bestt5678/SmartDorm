import type { ErrorRequestHandler, RequestHandler } from 'express'
import { MulterError } from 'multer'
import { ZodError } from 'zod'
import { Prisma } from '../../generated/prisma/client'
import { snakeKey } from '../lib/case'
import { AppError } from '../lib/http'

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ message: `ไม่พบเส้นทาง ${req.method} ${req.originalUrl}` })
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    })
    return
  }

  if (error instanceof MulterError) {
    res.status(400).json({
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)'
          : 'อัปโหลดไฟล์ไม่สำเร็จ',
    })
    return
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      message: 'ข้อมูลไม่ถูกต้อง',
      errors: error.issues.map((issue) => ({
        path: issue.path
          .map((segment) => (typeof segment === 'string' ? snakeKey(segment) : String(segment)))
          .join('.'),
        message: issue.message,
      })),
    })
    return
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({ message: 'ข้อมูลนี้มีอยู่แล้วในระบบ' })
      return
    }
    if (error.code === 'P2003') {
      res.status(409).json({ message: 'ไม่สามารถดำเนินการได้ เนื่องจากมีข้อมูลที่อ้างอิงอยู่' })
      return
    }
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'ไม่พบข้อมูลที่ต้องการ' })
      return
    }
  }

  console.error('[error]', error)
  res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' })
}
