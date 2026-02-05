import { execSync } from 'node:child_process'
import { cp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const kioskDir = path.resolve(process.cwd())
const adminDir = path.resolve(kioskDir, '..', 'admin')
const kioskDist = path.resolve(kioskDir, 'dist')
const adminDist = path.resolve(adminDir, 'dist')
const targetDir = path.resolve(kioskDist, 'admin')

const adminNodeModules = path.resolve(adminDir, 'node_modules')

if (!existsSync(adminNodeModules)) {
  execSync('npm install', { cwd: adminDir, stdio: 'inherit' })
}

execSync('npm run build', { cwd: adminDir, stdio: 'inherit' })

if (!existsSync(adminDist)) {
  throw new Error('Admin build failed: dist directory not found')
}

await rm(targetDir, { recursive: true, force: true })
await cp(adminDist, targetDir, { recursive: true })
