import { spawn } from "node:child_process"
import path from "node:path"
import { createRequire } from "node:module"
import { rootDir, loadWorkspaceEnv } from "./env.mjs"

const command = process.argv[2]
const extraArgs = process.argv.slice(3)
const localDefaultTenantId = "00000000-0000-0000-0000-000000000001"

if (!command) {
  console.error("Missing Next.js command. Usage: node ../../scripts/run-next.mjs <build|start> [...args]")
  process.exit(1)
}

const appDir = process.cwd()
const appRelativePath = path.relative(rootDir, appDir)
const appRequire = createRequire(path.join(appDir, "package.json"))
const nextBin = appRequire.resolve("next/dist/bin/next")
const env = loadWorkspaceEnv(appRelativePath)

const child = spawn(process.execPath, [nextBin, command, ...extraArgs], {
  cwd: appDir,
  env: {
    ...env,
    DEFAULT_TENANT_ID: env.DEFAULT_TENANT_ID || localDefaultTenantId,
  },
  stdio: "inherit",
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
