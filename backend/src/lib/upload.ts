import fs from 'node:fs'
import path from 'node:path'
import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { env } from '../config/env'
import { AppError } from './http'

export const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR)
fs.mkdirSync(uploadDir, { recursive: true })

const extensionByMime: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
}

function startsWith(buffer: Buffer, signature: number[]) {
  if (buffer.length < signature.length) return false
  return signature.every((byte, index) => buffer[index] === byte)
}

const signatureByMime: Record<string, (buffer: Buffer) => boolean> = {
  'image/jpeg': (buffer) => startsWith(buffer, [0xff, 0xd8, 0xff]),
  'image/png': (buffer) =>
    startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/webp': (buffer) =>
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP',
  'application/pdf': (buffer) => buffer.toString('ascii', 0, 4) === '%PDF',
}

export async function removeUploadedFile(filePath: string) {
  await fs.promises.unlink(filePath).catch(() => undefined)
}

export function cleanupSlipOnError(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const file = req.file
  if (!file) {
    next()
    return
  }

  res.on('finish', () => {
    if (res.statusCode >= 400) {
      void removeUploadedFile(file.path)
    }
  })
  res.on('close', () => {
    if (!res.writableFinished) {
      void removeUploadedFile(file.path)
    }
  })

  next()
}

export async function verifySlipSignature(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const file = req.file
  if (!file) {
    next()
    return
  }

  try {
    const handle = await fs.promises.open(file.path, 'r')
    const buffer = Buffer.alloc(12)
    try {
      await handle.read(buffer, 0, buffer.length, 0)
    } finally {
      await handle.close()
    }

    const check = signatureByMime[file.mimetype]
    if (!check || !check(buffer)) {
      await removeUploadedFile(file.path)
      next(new AppError(400, 'ไฟล์สลิปไม่ถูกต้องหรือเสียหาย'))
      return
    }

    next()
  } catch (error) {
    await removeUploadedFile(file.path)
    next(error)
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir)
  },
  filename: (_req, file, callback) => {
    const extension = extensionByMime[file.mimetype] ?? '.bin'
    callback(null, `slip-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`)
  },
})

export const slipUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!extensionByMime[file.mimetype]) {
      callback(new AppError(400, 'ไฟล์สลิปต้องเป็น JPG, PNG, WEBP หรือ PDF เท่านั้น'))
      return
    }
    callback(null, true)
  },
})
