/**
 * แปลงชื่อ key ระหว่าง camelCase (ภายใน backend / Prisma) กับ snake_case (API ที่ frontend ใช้)
 * แปลงเฉพาะ plain object และ array เท่านั้น ค่าอย่าง Date, Prisma.Decimal หรือ Buffer จะคงเดิม
 */

export function snakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)
}

export function camelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase())
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function convertKeys(value: unknown, convert: (key: string) => string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => convertKeys(item, convert))
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      result[convert(key)] = convertKeys(item, convert)
    }
    return result
  }
  return value
}

export function toSnake<T>(value: T): unknown {
  return convertKeys(value, snakeKey)
}

export function toCamel<T>(value: T): unknown {
  return convertKeys(value, camelKey)
}
