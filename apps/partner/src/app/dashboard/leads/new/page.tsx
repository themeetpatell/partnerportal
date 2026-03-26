"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Mail, Phone, Send, Sparkles, UserRound } from "lucide-react"
import { toast } from "sonner"

const SERVICES = [
  "Tax Registration",
  "VAT Filing",
  "Bookkeeping",
  "Company Formation",
  "Audit & Assurance",
  "CFO Services",
]

export default function NewLeadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCompany: "",
    notes: "",
    serviceInterests: [] as string[],
  })

  function toggle(service: string) {
    setForm((current) => ({
      ...current,
      serviceInterests: current.serviceInterests.includes(service)
        ? current.serviceInterests.filter((item) => item !== service)
        : [...current.serviceInterests, service],
    }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      toast.success("Lead submitted.")
      router.push("/dashboard/leads")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <section className="surface-card rounded-[2rem] px-6 py-7 sm:px-7">
        <div className="eyebrow">
          <Sparkles className="h-3.5 w-3.5" />
          Lead intake
        </div>
        <h1 className="page-title mt-5">Submit a lead</h1>
        <p className="page-subtitle mt-3">
          Capture enough context to make the handoff clean and keep qualification moving without backtracking.
        </p>

        <div className="mt-8 space-y-4">
          {[
            "Use a real business email whenever possible.",
            "Select service areas to make routing faster for the Finanshels team.",
            "Add notes that reduce follow-up questions and preserve context.",
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
          {[
            {
              label: "Full name",
              key: "customerName",
              placeholder: "John Smith",
              type: "text",
              required: true,
              icon: UserRound,
            },
            {
              label: "Email",
              key: "customerEmail",
              placeholder: "john@example.com",
              type: "email",
              required: true,
              icon: Mail,
            },
            {
              label: "Phone",
              key: "customerPhone",
              placeholder: "+971 50 000 0000",
              type: "text",
              required: false,
              icon: Phone,
            },
            {
              label: "Company",
              key: "customerCompany",
              placeholder: "Acme LLC",
              type: "text",
              required: false,
              icon: Building2,
            },
          ].map((field) => (
            <div key={field.key}>
              <label className="field-label">
                {field.label}
                {field.required ? <span className="ml-1 text-rose-300">*</span> : null}
              </label>
              <div className="relative">
                <field.icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  required={field.required}
                  type={field.type}
                  value={(form as Record<string, unknown>)[field.key] as string}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="field-input pl-11"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <label className="field-label">Services interested in</label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => {
              const active = form.serviceInterests.includes(service)

              return (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggle(service)}
                  className={`rounded-[1.15rem] border px-4 py-3 text-left text-sm font-medium transition-all ${
                    active
                      ? "border-[#58d5c4]/30 bg-[#58d5c4]/10 text-white"
                      : "border-white/8 bg-white/[0.03] text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {service}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6">
          <label className="field-label">Notes</label>
          <textarea
            rows={5}
            value={form.notes}
            onChange={(event) =>
              setForm((current) => ({ ...current, notes: event.target.value }))
            }
            placeholder="Key context, urgency, pricing signals, or anything the delivery team should know..."
            className="field-textarea"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="primary-button mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Send className="h-4 w-4" />
          {loading ? "Submitting..." : "Submit lead"}
        </button>
      </form>
    </div>
  )
}
