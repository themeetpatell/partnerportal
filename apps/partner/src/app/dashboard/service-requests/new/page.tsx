"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Mail, Sparkles, UserRound, Wrench } from "lucide-react"
import { toast } from "sonner"

const SERVICES = [
  "Tax Registration",
  "VAT Filing",
  "Bookkeeping",
  "Company Formation",
  "Audit & Assurance",
  "CFO Services",
]

export default function NewServiceRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    clientCompany: "",
    clientContact: "",
    clientEmail: "",
    serviceType: "",
    description: "",
  })

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        throw new Error("Failed")
      }

      toast.success("Request submitted.")
      router.push("/dashboard/service-requests")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="surface-card rounded-[2rem] px-6 py-7 sm:px-7">
        <div className="eyebrow">
          <Sparkles className="h-3.5 w-3.5" />
          Client work intake
        </div>
        <h1 className="page-title mt-5">New service request</h1>
        <p className="page-subtitle mt-3">
          Use this when the client relationship already exists and you need to route delivery through Finanshels quickly and clearly.
        </p>

        <div className="mt-8 space-y-4">
          {[
            "Choose the closest service category to speed up routing.",
            "Use the description to share business context, scope, and urgency.",
            "This screen is ideal for clients who are already warm and need execution next.",
          ].map((item, index) => (
            <div
              key={item}
              className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#58d5c4]/12 text-sm font-semibold text-[#8ce7db]">
                  0{index + 1}
                </div>
                <p className="pt-0.5 text-sm leading-6 text-slate-300">{item}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={submit} className="surface-card form-shell">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">
              Client company <span className="ml-1 text-rose-300">*</span>
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                required
                value={form.clientCompany}
                onChange={(event) =>
                  setForm((current) => ({ ...current, clientCompany: event.target.value }))
                }
                className="field-input pl-11"
                placeholder="Client company"
              />
            </div>
          </div>

          <div>
            <label className="field-label">
              Client contact <span className="ml-1 text-rose-300">*</span>
            </label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                required
                value={form.clientContact}
                onChange={(event) =>
                  setForm((current) => ({ ...current, clientContact: event.target.value }))
                }
                className="field-input pl-11"
                placeholder="Contact name"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">
              Client email <span className="ml-1 text-rose-300">*</span>
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                required
                type="email"
                value={form.clientEmail}
                onChange={(event) =>
                  setForm((current) => ({ ...current, clientEmail: event.target.value }))
                }
                className="field-input pl-11"
                placeholder="client@example.com"
              />
            </div>
          </div>

          <div>
            <label className="field-label">
              Service type <span className="ml-1 text-rose-300">*</span>
            </label>
            <select
              required
              value={form.serviceType}
              onChange={(event) =>
                setForm((current) => ({ ...current, serviceType: event.target.value }))
              }
              className="field-select"
            >
              <option value="">Select a service...</option>
              {SERVICES.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6">
          <label className="field-label">Description</label>
          <textarea
            rows={6}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            className="field-textarea"
            placeholder="Describe the requested work, timelines, context, or constraints..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="primary-button mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Wrench className="h-4 w-4" />
          {loading ? "Submitting..." : "Submit request"}
        </button>
      </form>
    </div>
  )
}
