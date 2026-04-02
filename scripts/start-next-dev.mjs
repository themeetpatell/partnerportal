import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { loadWorkspaceEnv } from "./env.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")
const appDir = process.cwd()

loadWorkspaceEnv({ rootDir, appDir })

const port = process.argv[2] || "3000"

function findListeningPids(targetPort) {
  const result = spawnSync("lsof", ["-ti", `tcp:${targetPort}`, "-sTCP:LISTEN"], {
    encoding: "utf8",
  })

  if (result.status !== 0 || !result.stdout.trim()) {
    return []
  }

  return result.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
}

function processCommand(pid) {
  const result = spawnSync("ps", ["-p", String(pid), "-o", "comm="], {
    encoding: "utf8",
  })

  if (result.status !== 0) {
    return ""
  }

  return result.stdout.trim()
}

function stopStaleNodeListeners(targetPort) {
  const pids = findListeningPids(targetPort)

  for (const pid of pids) {
    const command = processCommand(pid)

    if (command.includes("node") || command.includes("next-server")) {
      console.log(`Stopping stale Node listener on port ${targetPort} (pid ${pid})`)
      spawnSync("kill", ["-9", pid], { stdio: "inherit" })
      continue
    }

    if (command) {
      console.error(
        `Port ${targetPort} is already in use by non-Node process '${command}' (pid ${pid}). Stop it and try again.`,
      )
      process.exit(1)
    }
  }
}

stopStaleNodeListeners(port)

const require = createRequire(import.meta.url)
const nextBin = require.resolve("next/dist/bin/next")

const result = spawnSync(process.execPath, [nextBin, "dev", "--port", port], {
  cwd: appDir,
  stdio: "inherit",
  env: process.env,
})

process.exit(result.status ?? 1)
