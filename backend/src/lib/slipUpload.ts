import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { env } from '../config/env'
import { httpError } from './httpError'

export const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR)
fs.mkdirSync(uploadDir, { recursive: true })

const allowedTypes: any = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, callback) => {
    callback(null, 'slip-' + Date.now() + allowedTypes[file.mimetype])
  },
})

export const slipUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!allowedTypes[file.mimetype]) {
      return callback(httpError(400, 'ไฟล์สลิปต้องเป็น JPG, PNG, WEBP หรือ PDF เท่านั้น'))
    }
    callback(null, true)
  },
})
