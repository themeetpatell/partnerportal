import { currentUser } from "@clerk/nextjs/server"
import { BadgeCheck, Building2, Mail, ShieldCheck, User } from "lucide-react"

export default async function ProfilePage() {
  const user = await currentUser()
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Partner"

  return (
    <div className="space-y-8">
      <section className="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
        <div className="eyebrow">Account profile</div>
        <h1 className="page-title mt-5">Profile</h1>
        <p className="page-subtitle mt-3 max-w-2xl">
          This workspace identity anchors your partner access and the contact details used for payout and support workflows.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
        <div className="surface-card rounded-[2rem] p-6 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-gradient-to-br from-[#58d5c4]/20 to-[#f2bc74]/14 text-white">
              <User className="h-9 w-9 text-[#8ce7db]" />
            </div>

            <div>
              <h2 className="font-heading text-3xl font-semibold text-white">
                {fullName}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {user?.emailAddresses[0]?.emailAddress || "No email available"}
              </p>
              <div className="mt-4">
                <span className="tag-pill">
                  <BadgeCheck className="h-4 w-4 text-[#8ce7db]" />
                  Verified partner identity
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/6 text-[#8ce7db]">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Email</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {user?.emailAddresses[0]?.emailAddress || "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/6 text-[#f2bc74]">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Account ID</p>
                  <p className="mt-1 break-all text-sm font-medium text-white">
                    {user?.id || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-card rounded-[2rem] p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/6 text-[#8ce7db]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-semibold text-white">
                Account notes
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Current profile view is read-only.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {[
              "Your Clerk identity controls sign-in and secure access to the portal.",
              "Use the same business email consistently across registrations and partner communication.",
              "If commercial or billing details change, update them with the Finanshels team before payout cycles.",
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-start gap-4 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#58d5c4]/12 text-sm font-semibold text-[#8ce7db]">
                  0{index + 1}
                </div>
                <p className="pt-0.5 text-sm leading-6 text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
