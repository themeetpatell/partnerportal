import {
  createHmac,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "crypto"

const OTP_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes
const PURPOSE = "email-verify"
const AES_ALGO = "aes-256-gcm"

function getSecret(): string {
  const secret = process.env.OTP_HMAC_SECRET?.trim()
  if (!secret) {
    throw new Error("OTP_HMAC_SECRET environment variable is required")
  }
  return secret
}

/** Derive a 32-byte AES key from the HMAC secret. */
function deriveAesKey(): Buffer {
  return Buffer.from(
    createHmac("sha256", "otp-aes-key").update(getSecret()).digest()
  )
}

function computeHmac(email: string, code: string, expiresAt: number): string {
  const payload = `${email}:${code}:${expiresAt}:${PURPOSE}`
  return createHmac("sha256", getSecret()).update(payload).digest("hex")
}

function encrypt(plaintext: string): string {
  const key = deriveAesKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(AES_ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()])
  const tag = cipher.getAuthTag()
  // iv (12) + tag (16) + ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString("base64url")
}

function decrypt(token: string): string {
  const key = deriveAesKey()
  const buf = Buffer.from(token, "base64url")
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ciphertext = buf.subarray(28)
  const decipher = createDecipheriv(AES_ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf-8")
}

export function generateOtp(email: string): { code: string; challenge: string } {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  const expiresAt = Date.now() + OTP_EXPIRY_MS
  const hmac = computeHmac(email, code, expiresAt)

  const payload = JSON.stringify({ e: email, x: expiresAt, h: hmac })
  const challenge = encrypt(payload)

  return { code, challenge }
}

export function verifyOtp(
  code: string,
  challenge: string
): { valid: boolean; email: string | null; error?: "expired" | "invalid" } {
  try {
    const decrypted = decrypt(challenge)
    const decoded = JSON.parse(decrypted) as { e?: string; x?: number; h?: string }

    const email = decoded.e
    const expiresAt = decoded.x
    const storedHmac = decoded.h

    if (
      typeof email !== "string" ||
      typeof expiresAt !== "number" ||
      typeof storedHmac !== "string"
    ) {
      return { valid: false, email: null, error: "invalid" }
    }

    if (Date.now() > expiresAt) {
      return { valid: false, email: null, error: "expired" }
    }

    const expected = computeHmac(email, code, expiresAt)

    const a = Buffer.from(storedHmac, "hex")
    const b = Buffer.from(expected, "hex")

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { valid: false, email: null, error: "invalid" }
    }

    return { valid: true, email }
  } catch {
    return { valid: false, email: null, error: "invalid" }
  }
}
