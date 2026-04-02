"use client"

export function ClerkFallbackCard() {
  return (
    <div className="w-full max-w-[420px] rounded-[1.75rem] border border-amber-400/20 bg-amber-500/6 p-6 text-left shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/80">
        Authentication unavailable
      </p>
      <h2 className="mt-4 text-xl font-semibold text-white">
        Clerk failed to load the sign-in form.
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        The admin sign-in shell rendered, but the Clerk widget did not initialize.
        The configured Clerk instance is responding with
        <span className="font-medium text-amber-200"> `host_invalid`</span>.
      </p>
      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-slate-300">
        Confirm that the admin app is using the correct Clerk publishable key, the matching secret key,
        and that local hosts are allowed for this instance.
      </div>
    </div>
  )
}
