import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <div>
              <span className="text-zinc-100 font-semibold text-lg tracking-tight">
                Finanshels
              </span>
              <span className="ml-2 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Admin
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Sign In */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Admin Portal
          </h1>
          <p className="text-zinc-400 text-sm">
            Sign in with your Finanshels team account
          </p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          forceRedirectUrl="/dashboard"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  )
}
