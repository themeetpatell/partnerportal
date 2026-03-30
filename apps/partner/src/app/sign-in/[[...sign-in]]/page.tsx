import { SignIn } from "@clerk/nextjs"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function SignInPage() {
  return (
    <div className="page-wrap min-h-screen">
      <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <span className="tag-pill">Partner portal</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center px-5 pb-16 pt-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-[0_12px_28px_rgba(99,102,241,0.28)]">
            <span className="text-xl font-bold tracking-tight">F</span>
          </div>
          <h1 className="font-heading text-3xl font-semibold text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to your Finanshels Partner account
          </p>
        </div>

        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
          fallbackRedirectUrl="/dashboard"
        />

        <p className="mt-6 text-sm text-slate-500">
          Not a partner yet?{" "}
          <Link
            href="/register"
            className="font-medium text-white transition-colors hover:text-slate-200"
          >
            Apply to join
          </Link>
        </p>
      </div>
    </div>
  )
}
