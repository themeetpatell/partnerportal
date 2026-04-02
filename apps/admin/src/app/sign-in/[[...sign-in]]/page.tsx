import { ClerkFailed, ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs"
import { ClerkFallbackCard } from "@/components/clerk-fallback-card"

export default function SignInPage() {
  return (
    <div className="relative min-h-screen">
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-[0_12px_28px_rgba(99,102,241,0.28)]">
            <span className="text-xl font-bold tracking-tight">F</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Admin Portal
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in with your Finanshels team account
          </p>
        </div>

        <ClerkLoading>
          <div className="h-[540px] w-full max-w-[420px] rounded-[1.75rem] border border-white/10 bg-white/[0.03]" />
        </ClerkLoading>

        <ClerkLoaded>
          <SignIn
            routing="path"
            path="/sign-in"
            forceRedirectUrl="/dashboard"
            fallbackRedirectUrl="/dashboard"
          />
        </ClerkLoaded>

        <ClerkFailed>
          <ClerkFallbackCard />
        </ClerkFailed>
      </div>
    </div>
  )
}
