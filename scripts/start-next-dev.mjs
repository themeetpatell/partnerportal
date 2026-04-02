import { execFileSync, spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const appDir = process.cwd()
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const port = process.argv[2]
const localDefaultTenantId = "00000000-0000-0000-0000-000000000001"
const importantEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
]

if (!port) {
  console.error("Missing port. Usage: node ../../scripts/start-next-dev.mjs <port>")
  process.exit(1)
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getListeners(portNumber) {
  try {
    const output = execFileSync("lsof", ["-nP", `-iTCP:${portNumber}`, "-sTCP:LISTEN", "-Fpc"], {
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

async function ensurePortAvailable(portNumber) {
  const listeners = getListeners(portNumber)
  if (listeners.length === 0) {
    return
  }

  const nonNodeListeners = listeners.filter((listener) => listener.command !== "node")
  if (nonNodeListeners.length > 0) {
    const summary = nonNodeListeners
      .map((listener) => `${listener.command} (${listener.pid})`)
      .join(", ")
    throw new Error(`Port ${portNumber} is already in use by ${summary}. Stop that process and retry.`)
  }

  for (const listener of listeners) {
    try {
      process.kill(listener.pid, "SIGTERM")
    } catch {}
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (getListeners(portNumber).length === 0) {
      return
    }

    await sleep(150)
  }

  for (const listener of getListeners(portNumber)) {
    try {
      process.kill(listener.pid, "SIGKILL")
    } catch {}
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (getListeners(portNumber).length === 0) {
      return
    }

    await sleep(150)
  }

  throw new Error(`Port ${portNumber} is still busy after stopping existing node processes.`)
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

function resetNextArtifacts(appDirPath) {
  const nextDir = path.join(appDirPath, ".next")
  try {
    fs.rmSync(nextDir, { recursive: true, force: true })
  } catch (error) {
    throw new Error(
      `Failed to reset ${path.relative(rootDir, nextDir)} before starting dev: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

function warnOnEnvOverrides(rootEnv, appEnv, appDirPath) {
  const overriddenKeys = importantEnvKeys.filter((key) => {
    return rootEnv[key] && appEnv[key] && rootEnv[key] !== appEnv[key]
  })

  if (overriddenKeys.length === 0) {
    return
  }

  console.warn(
    `[dev] ${path.relative(rootDir, appDirPath)} overrides root .env.local for: ${overriddenKeys.join(", ")}. ` +
      "Keep Supabase auth values aligned across env files to avoid auth confusion.",
  )
}

function resolveDefaultTenantId(rootEnv, appEnv, appDirPath) {
  const tenantId = appEnv.DEFAULT_TENANT_ID || rootEnv.DEFAULT_TENANT_ID || process.env.DEFAULT_TENANT_ID

  if (tenantId) {
    return tenantId
  }

  console.warn(
    `[dev] ${path.relative(rootDir, appDirPath)} is missing DEFAULT_TENANT_ID. ` +
      `Falling back to seeded local tenant ${localDefaultTenantId}.`,
  )

  return localDefaultTenantId
}

async function main() {
  await ensurePortAvailable(port)

  const rootEnv = parseEnvFile(path.join(rootDir, ".env.local"))
  const appEnv = parseEnvFile(path.join(appDir, ".env.local"))
  warnOnEnvOverrides(rootEnv, appEnv, appDir)
  const defaultTenantId = resolveDefaultTenantId(rootEnv, appEnv, appDir)
  const appRequire = createRequire(path.join(appDir, "package.json"))
  const nextBin = appRequire.resolve("next/dist/bin/next")
  resetNextArtifacts(appDir)

  const child = spawn(process.execPath, [nextBin, "dev", "--turbopack", "--port", port], {
    cwd: appDir,
    env: {
      ...rootEnv,
      ...appEnv,
      ...process.env,
      DEFAULT_TENANT_ID: defaultTenantId,
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
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
