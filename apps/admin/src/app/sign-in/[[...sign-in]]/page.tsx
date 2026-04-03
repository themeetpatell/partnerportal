import { auth } from "@repo/auth/server"
import Image from "next/image"
import { redirect } from "next/navigation"
import { AdminSignInForm } from "@/components/admin-sign-in-form"
import { getActiveTeamMember } from "@/lib/admin-auth"

export default async function SignInPage() {
  const { userId } = await auth()

  if (userId) {
    const teamMember = await getActiveTeamMember(userId)

    if (teamMember) {
      redirect("/dashboard")
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16">
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
            Sign in with your Finanshels team account
          </p>
        </div>

        <AdminSignInForm />
      </div>
    </div>
  )
}
