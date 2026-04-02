import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

const apps = [
  {
    name: "partner",
    cwd: path.join(rootDir, "apps", "partner"),
    args: [path.join(rootDir, "scripts", "start-next-dev.mjs"), "3000"],
  },
  {
    name: "admin",
    cwd: path.join(rootDir, "apps", "admin"),
    args: [path.join(rootDir, "scripts", "start-next-dev.mjs"), "3001"],
  },
]

const children = apps.map((app) =>
  spawn(process.execPath, app.args, {
    cwd: app.cwd,
    stdio: "inherit",
    env: process.env,
  }),
)

let shuttingDown = false

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM")
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill("SIGKILL")
      }
    }

    process.exit(exitCode)
  }, 500).unref()
}

for (const [index, child] of children.entries()) {
  const app = apps[index]

  child.on("close", (code, signal) => {
    if (shuttingDown) {
      return
    }

    const exitCode = typeof code === "number" ? code : signal ? 1 : 0

    if (exitCode !== 0) {
      console.error(`${app.name} dev server exited unexpectedly.`)
    }

    shutdown(exitCode)
  })
}

process.on("SIGINT", () => shutdown(0))
process.on("SIGTERM", () => shutdown(0))
