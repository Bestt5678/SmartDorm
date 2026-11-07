import { app } from './app'
import { env } from './config/env'
import { prisma } from './lib/prisma'

const server = app.listen(env.PORT, () => {
  console.log(`SmartDorm API listening on http://localhost:${env.PORT}`)
})

async function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down...`)
  server.close(() => {
    void prisma.$disconnect().finally(() => {
      process.exit(0)
    })
  })
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})
process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})
