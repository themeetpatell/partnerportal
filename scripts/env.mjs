import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export function parseEnvFile(filePath) {
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

export function loadWorkspaceEnv(appRelativePath) {
  const rootEnv = parseEnvFile(path.join(rootDir, ".env.local"))
  const appEnv = appRelativePath
    ? parseEnvFile(path.join(rootDir, appRelativePath, ".env.local"))
    : {}

  return {
    ...rootEnv,
    ...appEnv,
    ...process.env,
  }
}
