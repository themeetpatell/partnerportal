import fs from "node:fs"
import path from "node:path"

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

export function loadWorkspaceEnv({ rootDir, appDir }) {
  const envSources = [
    parseEnvFile(path.join(rootDir, ".env.local")),
    parseEnvFile(path.join(appDir, ".env.local")),
  ]

  for (const source of envSources) {
    for (const [key, value] of Object.entries(source)) {
      if (!process.env[key] && value) {
        process.env[key] = value
      }
    }
  }

  return process.env
}
