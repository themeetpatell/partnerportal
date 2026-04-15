import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { VerifyConfirmButton } from "./verify-confirm-button"

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

            <VerifyConfirmButton tokenHash={tokenHash} type={type} nextPath={next} />
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
