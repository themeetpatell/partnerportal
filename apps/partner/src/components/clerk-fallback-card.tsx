"use client"

import Link from "next/link"

type ClerkFallbackCardProps = {
  ctaHref: string
  ctaLabel: string
}

export function ClerkFallbackCard({
  ctaHref,
  ctaLabel,
}: ClerkFallbackCardProps) {
  return (
    <div className="surface-card-strong rounded-[1.75rem] border border-amber-400/20 bg-amber-500/6 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80">
        Authentication unavailable
      </p>
      <h2 className="mt-4 text-xl font-semibold text-white">
        Clerk failed to load the sign-in form.
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        The page layout is rendering, but the Clerk widget is not initializing.
        In this workspace the Clerk frontend API is returning
        <span className="font-medium text-amber-200"> `host_invalid`</span>.
      </p>
      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-slate-300">
        <p>Check these first:</p>
        <ul className="mt-3 space-y-2">
          <li>Use a matching `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` pair.</li>
          <li>Make sure the keys come from the same Clerk instance.</li>
          <li>Allow `http://localhost:3000` and `http://localhost:3001` in Clerk for local development.</li>
        </ul>
      </div>
      <div className="mt-6">
        <Link
          href={ctaHref}
          className="inline-flex items-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  )
}
