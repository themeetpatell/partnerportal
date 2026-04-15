import Link from "next/link"
import Image from "next/image"
import { ArrowRight, ShieldCheck } from "lucide-react"

function getSafeValue(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return ""
  }

  return value
}

export default async function PartnerVerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const tokenHash = getSafeValue(params.token_hash)
  const type = getSafeValue(params.type)
  const next = getSafeValue(params.next) || "/reset-password"
  const hasRequiredParams = Boolean(tokenHash && type)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-10 flex items-center gap-3">
          <Image
            src="/brand-mark.png"
            alt="Finanshels logo"
            width={36}
            height={36}
            className="h-9 w-9"
            priority
          />
          <div>
            <p className="text-foreground font-bold text-sm tracking-tight">Finanshels</p>
            <p className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.28em]">Partner Portal</p>
          </div>
        </div>

        {hasRequiredParams ? (
          <>
            <h2
              className="mb-1.5 text-foreground font-extrabold leading-tight tracking-[-0.04em]"
              style={{ fontSize: "1.875rem" }}
            >
              Continue to password reset
            </h2>
            <p className="mb-8 text-sm text-muted-foreground">
              Confirm to continue. This prevents email scanners from consuming your one-time link.
            </p>

            <form action="/auth/verify/confirm" method="POST" className="space-y-4">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="next" value={next} />

              <div
                className="rounded-2xl p-7 text-center"
                style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.16)" }}
              >
                <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-indigo-300" />
                <p className="mb-1 text-sm font-medium text-foreground">Verification required</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Confirm this action to continue to your password reset screen.
                </p>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-foreground transition-all duration-150"
                style={{
                  height: "46px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg,#818cf8 0%,#6366f1 55%,#4f46e5 100%)",
                  boxShadow: "0 4px 18px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
                  marginTop: "8px",
                }}
              >
                Continue to reset password
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div
            className="rounded-2xl p-7 text-center"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.16)" }}
          >
            <p className="mb-1 text-sm font-medium text-foreground">Verification link unavailable</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This verification link is missing required data. Request a new password reset email.
            </p>
            <Link
              href="/sign-in"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary"
            >
              Return to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
