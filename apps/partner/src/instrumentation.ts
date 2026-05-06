import { assertRequiredEnvForBootstrap } from "./lib/env-bootstrap"

export function register() {
  assertRequiredEnvForBootstrap()
}
