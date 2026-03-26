import { SignIn } from "@clerk/nextjs"
import Link from "next/link"

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-zinc-100 font-semibold text-lg tracking-tight">
              Finanshels
            </span>
          </Link>
        </div>
      </nav>

      {/* Sign In */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-zinc-400 text-sm">
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
        <p className="mt-6 text-zinc-500 text-sm">
          Not a partner yet?{" "}
          <Link
            href="/register"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Apply to join
          </Link>
        </p>
      </div>
    </div>
  )
}
