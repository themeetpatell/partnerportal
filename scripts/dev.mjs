import { execFileSync, spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const localDefaultTenantId = "00000000-0000-0000-0000-000000000001"

const apps = [
  { name: "@repo/partner", cwd: path.join(rootDir, "apps/partner"), port: "3000" },
  { name: "@repo/admin", cwd: path.join(rootDir, "apps/admin"), port: "3001" },
]

const children = new Set()
let shuttingDown = false
const importantEnvKeys = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
]

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getListeners(port) {
  try {
    const output = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpc"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })

    const listeners = []
    let currentPid = null
    let currentCommand = null

    for (const line of output.split(/\r?\n/)) {
      if (line.startsWith("p")) {
        currentPid = Number(line.slice(1))
      }

      if (line.startsWith("c")) {
        currentCommand = line.slice(1)
      }

      if (currentPid && currentCommand) {
        listeners.push({ pid: currentPid, command: currentCommand })
        currentPid = null
        currentCommand = null
      }
    }

    return listeners
  } catch {
    return []
  }
}

async function ensurePortAvailable(port) {
  const listeners = getListeners(port)
  if (listeners.length === 0) {
    return
  }

  const nonNodeListeners = listeners.filter((listener) => listener.command !== "node")
  if (nonNodeListeners.length > 0) {
    const summary = nonNodeListeners
      .map((listener) => `${listener.command} (${listener.pid})`)
      .join(", ")
    throw new Error(`Port ${port} is already in use by ${summary}. Stop that process and retry.`)
  }

  for (const listener of listeners) {
    try {
      process.kill(listener.pid, "SIGTERM")
    } catch {}
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (getListeners(port).length === 0) {
      return
    }

    await sleep(150)
  }

  for (const listener of getListeners(port)) {
    try {
      process.kill(listener.pid, "SIGKILL")
    } catch {}
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (getListeners(port).length === 0) {
      return
    }

    await sleep(150)
  }

  throw new Error(`Port ${port} is still busy after stopping existing node processes.`)
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const env = {}
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    env[key] = value
  }

  return env
}

const rootEnv = parseEnvFile(path.join(rootDir, ".env.local"))

function warnOnEnvOverrides(appName, appEnv) {
  const overriddenKeys = importantEnvKeys.filter((key) => {
    return rootEnv[key] && appEnv[key] && rootEnv[key] !== appEnv[key]
  })

  if (overriddenKeys.length === 0) {
    return
  }

  console.warn(
    `[dev] ${appName} overrides root .env.local for: ${overriddenKeys.join(", ")}. ` +
      "Keep Clerk values aligned across env files to avoid auth confusion.",
  )
}

function resolveDefaultTenantId(appName, appEnv) {
  const tenantId = appEnv.DEFAULT_TENANT_ID || rootEnv.DEFAULT_TENANT_ID || process.env.DEFAULT_TENANT_ID

  if (tenantId) {
    return tenantId
  }

  console.warn(
    `[dev] ${appName} is missing DEFAULT_TENANT_ID. Falling back to seeded local tenant ${localDefaultTenantId}.`,
  )

  return localDefaultTenantId
}

function stopChildren(signal = "SIGTERM") {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal)
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    stopChildren(signal)
  })
}

async function main() {
  for (const app of apps) {
    await ensurePortAvailable(app.port)
  }

  for (const app of apps) {
    const appRequire = createRequire(path.join(app.cwd, "package.json"))
    const nextBin = appRequire.resolve("next/dist/bin/next")
    const appEnv = parseEnvFile(path.join(app.cwd, ".env.local"))
    warnOnEnvOverrides(app.name, appEnv)
    const defaultTenantId = resolveDefaultTenantId(app.name, appEnv)

    const child = spawn(process.execPath, [nextBin, "dev", "--turbopack", "--port", app.port], {
      cwd: app.cwd,
      env: {
        ...rootEnv,
        ...appEnv,
        ...process.env,
        DEFAULT_TENANT_ID: defaultTenantId,
      },
      stdio: "inherit",
    })

    children.add(child)

    child.on("exit", (code, signal) => {
      children.delete(child)

      if (shuttingDown) {
        if (children.size === 0) {
          process.exit(code ?? 0)
        }
        return
      }

      shuttingDown = true
      stopChildren(signal ?? "SIGTERM")

      const exitCode = typeof code === "number" ? code : 1
      process.exit(exitCode)
    })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
