import { currentUser } from "@clerk/nextjs/server"
import { Settings, User, Shield, Bell } from "lucide-react"

export default async function SettingsPage() {
  const user = await currentUser()

  const userName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.emailAddresses[0]?.emailAddress ||
    "Admin"

  const userEmail = user?.emailAddresses[0]?.emailAddress ?? ""
  const userRole = (user?.publicMetadata?.role as string) || "Admin"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your account and portal preferences
        </p>
      </div>

      {/* Profile */}
      <div className="surface-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Profile</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider">
              Full Name
            </label>
            <p className="text-white text-sm bg-white/6 border border-white/8 rounded-lg px-3 py-2">
              {userName}
            </p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider">
              Email Address
            </label>
            <p className="text-white text-sm bg-white/6 border border-white/8 rounded-lg px-3 py-2">
              {userEmail}
            </p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider">
              Role
            </label>
            <p className="text-white text-sm bg-white/6 border border-white/8 rounded-lg px-3 py-2 capitalize">
              {userRole}
            </p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider">
              User ID
            </label>
            <p className="text-slate-500 text-sm bg-white/6 border border-white/8 rounded-lg px-3 py-2 font-mono">
              {user?.id ?? "—"}
            </p>
          </div>
        </div>
        <p className="text-slate-600 text-xs mt-4">
          To update your profile, visit your Clerk account settings.
        </p>
      </div>

      {/* Security */}
      <div className="surface-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Shield className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Security</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-white/10">
            <div>
              <p className="text-white text-sm font-medium">Password</p>
              <p className="text-slate-500 text-xs mt-0.5">Managed by Clerk</p>
            </div>
            <span className="text-xs text-slate-600 bg-white/6 border border-white/8 px-2 py-1 rounded">
              External
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-white text-sm font-medium">Two-Factor Authentication</p>
              <p className="text-slate-500 text-xs mt-0.5">Manage 2FA in your Clerk account</p>
            </div>
            <span className="text-xs text-slate-600 bg-white/6 border border-white/8 px-2 py-1 rounded">
              External
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="surface-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Notifications</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: "New lead submitted", sub: "When a partner submits a new lead" },
            { label: "Commission approval required", sub: "When a commission is ready for review" },
            { label: "Service request updates", sub: "Status changes on service requests" },
            { label: "Invoice overdue", sub: "When an invoice passes its due date" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-white/10 last:border-0">
              <div>
                <p className="text-white text-sm font-medium">{item.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{item.sub}</p>
              </div>
              <span className="text-xs text-slate-600 bg-white/6 border border-white/8 px-2 py-1 rounded">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Portal Info */}
      <div className="surface-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Settings className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Portal Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider">
              Platform
            </label>
            <p className="text-white text-sm bg-white/6 border border-white/8 rounded-lg px-3 py-2">
              Finanshels Admin Portal
            </p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wider">
              Environment
            </label>
            <p className="text-white text-sm bg-white/6 border border-white/8 rounded-lg px-3 py-2 font-mono">
              {process.env.NODE_ENV}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
