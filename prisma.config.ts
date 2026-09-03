// GANTI INI:
// import { defineConfig } from 'prisma'

// MENJADI INI:
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config' // <--- Ambil dari prisma/config

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_URL'), // Menggunakan helper env bawaan prisma/config
  },
})
