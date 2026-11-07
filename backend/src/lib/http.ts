import type { NextFunction, Request, RequestHandler, Response } from 'express'

export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next)
  }
}

export function parseId(value: string | string[] | undefined, label = 'id'): number {
  const raw = Array.isArray(value) ? value[0] : value
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, `${label} ไม่ถูกต้อง`)
  }
  return id
}
