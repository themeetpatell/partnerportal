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

export default async function AdminVerifyPage({
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
    <div className="relative min-h-screen">
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
        <div className="w-full max-w-[420px] rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
          <div className="mb-8 text-center">
            <Image
              src="/brand-mark.png"
              alt="Finanshels logo"
              width={56}
              height={56}
              className="mx-auto mb-5 h-14 w-14"
              priority
            />
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Admin Portal
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Confirm to continue to your password reset screen
            </p>
          </div>

          {hasRequiredParams ? (
            <VerifyConfirmButton tokenHash={tokenHash} type={type} nextPath={next} />
          ) : (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-5 text-center">
              <p className="text-sm font-medium text-white">Verification link unavailable</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                This verification link is missing required data. Request a new password reset email.
              </p>
              <Link
                href="/sign-in"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 transition-colors hover:text-indigo-200"
              >
                Return to sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
