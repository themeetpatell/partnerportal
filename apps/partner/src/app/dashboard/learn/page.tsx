import Link from "next/link"
import { BookOpen, ChevronRight, DollarSign, FileText, HelpCircle, Lightbulb, ShieldCheck, TrendingUp } from "lucide-react"

// ─── Content ──────────────────────────────────────────────────────────────────

const SERVICE_CATEGORIES = [
  {
    id: "tax",
    icon: ShieldCheck,
    color: "indigo",
    title: "Tax & Compliance",
    description: "VAT, Corporate Tax, AML, and regulatory filings.",
    services: [
      {
        name: "VAT Registration",
        what: "Registering a business with the UAE Federal Tax Authority to collect and remit VAT.",
        who: "Any UAE business approaching or exceeding AED 375,000 in annual taxable supplies. Mandatory once they cross the threshold.",
        pitch: [
          "Ask: \"Is your monthly revenue growing past ~AED 30,000?\" — if yes, VAT registration is imminent.",
          "Often paired with ongoing VAT filing — one referral leads to a long-term recurring service.",
          "Fast turnaround: FTA registration takes ~5–10 business days. Clients appreciate speed.",
        ],
        objections: [
          { q: "We'll handle it ourselves.", a: "FTA rejections are common with DIY filings. Finanshels' success rate is near 100% because we know exactly what documentation the FTA expects." },
          { q: "We're not big enough yet.", a: "The threshold is AED 375K annually — that's ~AED 31K/month. If they're close, it's worth getting it right from the start to avoid penalties." },
        ],
      },
      {
        name: "VAT Filing",
        what: "Preparing and submitting quarterly VAT returns to the FTA on behalf of the business.",
        who: "Any VAT-registered business in the UAE. Every registered entity must file regardless of revenue size.",
        pitch: [
          "Recurring revenue for you: every client on VAT filing generates a commission each cycle.",
          "Penalties for late or incorrect filing are steep — clients value peace of mind.",
          "Bundle pitch: 'Get registered and we'll handle your filings going forward.' Closes both in one conversation.",
        ],
        objections: [
          { q: "Our accountant does it.", a: "Finanshels specialises in UAE tax compliance. Many accountants outsource VAT filing to us anyway — we have direct FTA experience." },
        ],
      },
      {
        name: "Corporate Tax Registration & Filing",
        what: "Registering for UAE Corporate Tax (CT) with the FTA and filing annual CT returns. Mandatory since June 2023 for most UAE entities.",
        who: "Every company incorporated in the UAE — free zone or mainland — unless specifically exempt. This is not optional.",
        pitch: [
          "This is mandatory — not a nice-to-have. Every business you know needs this.",
          "Many businesses don't realise they need to register even if their profit is below the 9% threshold.",
          "High urgency: penalties start from AED 10,000 for non-registration.",
        ],
        objections: [
          { q: "We're a free zone company — we're exempt.", a: "Most free zone companies are still required to register and file, even if they qualify for 0% tax. Finanshels can confirm their status and handle the filing." },
          { q: "Our profit is below AED 375K so we don't owe tax.", a: "You still have to register and file a return. Non-compliance penalties apply regardless of profit." },
        ],
      },
      {
        name: "AML Compliance",
        what: "Anti-Money Laundering programme setup, goAML registration, and periodic reporting for designated non-financial businesses and professions (DNFBPs).",
        who: "Real estate agents, lawyers, accountants, precious metals dealers, and company formation agents. Mandatory for these sectors under UAE AML law.",
        pitch: [
          "If you work with real estate clients, this is a warm referral — brokers and developers are legally required to comply.",
          "goAML registration and Suspicious Transaction Reporting (STR) are technical — clients want a specialist.",
          "Penalties for non-compliance can be severe: fines and licence suspension.",
        ],
        objections: [
          { q: "We don't deal with suspicious transactions.", a: "AML compliance isn't just about reporting suspicious activity — it's about having the programme, policies, and registration in place. The obligation is on all DNFBPs." },
        ],
      },
    ],
  },
  {
    id: "accounting",
    icon: FileText,
    color: "sky",
    title: "Accounting & Bookkeeping",
    description: "Monthly, quarterly, and annual accounting packages.",
    services: [
      {
        name: "Monthly Accounting (Scale)",
        what: "Full monthly bookkeeping, reconciliation, management accounts, and financial reporting for growing businesses.",
        who: "Businesses with 100+ monthly transactions or AED 2M+ in annual revenue who need real-time financial visibility.",
        pitch: [
          "Banks require up-to-date accounts for credit facilities and overdrafts. Growing clients need this.",
          "Ask: 'Does your team know exactly what you earned and spent last month?' If not, this solves it.",
          "Frame it as hiring a part-time finance team — far cheaper than a full-time hire.",
        ],
        objections: [
          { q: "We manage in Excel.", a: "Excel works until it doesn't. Finanshels moves clients to a proper system — they get real financial data, not estimates." },
        ],
      },
      {
        name: "Quarterly Accounting (Growth)",
        what: "Quarterly bookkeeping and management accounts — a middle tier for businesses that need regular financial reporting without monthly overhead.",
        who: "SMEs with moderate transaction volumes (20–100/month) who need accurate books for tax filing and investor reporting.",
        pitch: [
          "Perfect entry point for clients who think monthly accounting is overkill — grow them into it.",
          "Quarterly accounts are required as supporting documentation for many VAT filings and bank facilities.",
        ],
        objections: [],
      },
      {
        name: "Annual Accounting (Essential)",
        what: "Year-end bookkeeping, P&L, balance sheet, and statutory accounts preparation.",
        who: "Small businesses with fewer than 20 monthly transactions that primarily need accounts for tax filing.",
        pitch: [
          "Lowest friction to close — the client only needs to engage once a year.",
          "Natural upsell path: once they see the value, move them to quarterly or monthly.",
        ],
        objections: [],
      },
      {
        name: "Financial Statement Preparation",
        what: "Preparation of formal financial statements (P&L, balance sheet, cash flow) in IFRS format.",
        who: "Companies seeking bank loans, investor funding, or that have an audit requirement.",
        pitch: [
          "Banks won't lend without audited or at least reviewed financials. This is a gateway product.",
          "Any client raising capital — angels, VCs, or debt — will need this.",
        ],
        objections: [
          { q: "We have basic accounts already.", a: "Basic internal accounts are not the same as IFRS-compliant financials that banks and auditors accept. Finanshels prepares these to institutional standard." },
        ],
      },
      {
        name: "Management Accounting",
        what: "Monthly management reports including KPI dashboards, budget vs actual, and cash flow forecasts.",
        who: "Business owners who want to make data-driven decisions — typically AED 5M+ revenue businesses.",
        pitch: [
          "Ask: 'Do you know which product or service line is most profitable right now?' If they hesitate, this is the gap.",
          "Founders love this — it's the CFO-level visibility they can't afford to hire for full-time.",
        ],
        objections: [],
      },
    ],
  },
  {
    id: "audit",
    icon: BookOpen,
    color: "amber",
    title: "Audit & Legal",
    description: "Audits, financial statements, and corporate restructuring.",
    services: [
      {
        name: "Auditing",
        what: "Independent audit of financial statements by Finanshels' registered auditors, providing a signed audit report.",
        who: "Free zone companies (mandatory annually), businesses applying for bank facilities, and any entity required by shareholders or regulators.",
        pitch: [
          "Most free zone licences require an annual audit — this is a recurring, mandatory engagement.",
          "Banks require an audit report for business loans above a certain threshold.",
          "Q4 and Q1 are peak audit season — timing your pitch around year-end works well.",
        ],
        objections: [
          { q: "Our auditor is a small firm we've used for years.", a: "Finanshels is a licensed audit firm in the UAE. For businesses seeking bank facilities or scaling, the credibility of the audit firm matters." },
        ],
      },
      {
        name: "Audited Financial Statements",
        what: "Audit + financial statement preparation bundled — delivers signed, audited accounts ready for banks, investors, and regulators.",
        who: "Companies raising debt, applying for credit facilities, or required by free zone authority to submit audited accounts.",
        pitch: [
          "The 'all-in' solution — clients appreciate not having to coordinate between multiple firms.",
          "High value engagement — strong commission potential.",
        ],
        objections: [],
      },
      {
        name: "Liquidation",
        what: "Managed company liquidation — handling the legal, financial, and regulatory process to wind down a UAE entity.",
        who: "Business owners closing a company (voluntary or otherwise), restructuring groups, or handling estate matters.",
        pitch: [
          "Liquidation is complex in the UAE — VAT deregistration, tax clearance, and RERA/free zone approvals are all required.",
          "Business owners who are shutting down need a trusted specialist, not a general law firm.",
        ],
        objections: [],
      },
    ],
  },
  {
    id: "advisory",
    icon: TrendingUp,
    color: "emerald",
    title: "Advisory & Strategy",
    description: "CFO services, financial modelling, and strategic finance.",
    services: [
      {
        name: "CFO Services / Fractional CFO",
        what: "A senior finance professional embedded part-time in the client's business — handling fundraising, cash flow, banking relationships, and financial strategy.",
        who: "Startups pre/post Series A, SMEs with revenue AED 5M–50M that can't justify a full-time CFO.",
        pitch: [
          "Ask: 'Who in your business manages investor relations and bank relationships?' If it's the founder alone, they need this.",
          "Fundraising trigger: any client raising a round in the next 12 months needs a CFO — Finanshels can step in immediately.",
          "Best positioned for: tech startups, e-commerce businesses scaling fast, and family businesses preparing for succession.",
        ],
        objections: [
          { q: "We can't afford a CFO.", a: "A fractional CFO costs a fraction of a full-time hire. You get the same calibre of strategic thinking — just on the days you actually need it." },
          { q: "Our accountant handles strategy.", a: "Accountants look backwards. A CFO looks forwards — managing cash runway, structuring deals, and securing financing." },
        ],
      },
      {
        name: "Financial Modelling",
        what: "Building a detailed financial model (3-statement, DCF, or scenario planning) for fundraising, business planning, or M&A.",
        who: "Founders raising capital, businesses doing M&A, or operators making a major investment decision.",
        pitch: [
          "Any client going to an investor or bank needs a model. If they're building one in Excel themselves, it probably won't pass investor scrutiny.",
          "Position this as the single most important document in any fundraise.",
        ],
        objections: [
          { q: "We have a model already.", a: "Investor-grade models are different from operational ones. Finanshels builds models that answer investor questions before they're asked." },
        ],
      },
      {
        name: "Salary Benchmarking",
        what: "Benchmarking compensation packages against UAE market data to help businesses hire competitively and retain talent.",
        who: "HR teams and founders scaling headcount — typically Series A+ startups and established SMEs.",
        pitch: [
          "Talent is the biggest cost for most service businesses. Overpaying burns cash; underpaying loses people.",
          "Good entry point into a relationship — often leads to broader advisory mandates.",
        ],
        objections: [],
      },
    ],
  },
]

const GENERAL_SALES_GUIDE = [
  {
    heading: "The qualifying question that opens everything",
    body: "\"Do you have an in-house finance team?\" If no — they outsource. Ask who does their VAT, bookkeeping, and tax. Most SMEs cobble this together and hate it. That's your opening.",
  },
  {
    heading: "Trigger events to watch for",
    body: "New company formation, approaching VAT threshold (AED 375K), applying for a bank loan, raising investment, changing auditors, or a key finance hire leaving — all of these create immediate demand for Finanshels services.",
  },
  {
    heading: "Don't pitch services — pitch outcomes",
    body: "Instead of \"Finanshels does bookkeeping\", say \"your clients will always know exactly where their cash is and never stress about a VAT deadline again.\" Lead with the outcome, introduce the service second.",
  },
  {
    heading: "Stack services for higher commission",
    body: "VAT Registration + VAT Filing is a natural bundle. Corporate Tax Registration + Filing is another. Accounting + Audit is a third. A client buying two services doubles your commission from one relationship.",
  },
  {
    heading: "Use service requests for your won clients",
    body: "Once a lead converts, they're in Finanshels' system. Use the Service Requests feature in your portal to introduce additional services — you earn commission on every one they take up.",
  },
  {
    heading: "Urgency isn't artificial — use real deadlines",
    body: "FTA penalties start from AED 10,000 for late Corporate Tax registration. VAT filing penalties are AED 1,000 per month. These are real, material consequences. Use them — calmly, factually.",
  },
]

// ─── Components ──────────────────────────────────────────────────────────────

function ColorClasses(color: string) {
  const map: Record<string, { icon: string; badge: string; border: string }> = {
    indigo: {
      icon: "bg-indigo-500/12 text-indigo-300",
      badge: "border-indigo-400/20 bg-indigo-500/10 text-indigo-200",
      border: "border-indigo-400/15",
    },
    sky: {
      icon: "bg-sky-500/12 text-sky-300",
      badge: "border-sky-400/20 bg-sky-500/10 text-sky-200",
      border: "border-sky-400/15",
    },
    amber: {
      icon: "bg-amber-500/12 text-amber-300",
      badge: "border-amber-400/20 bg-amber-500/10 text-amber-200",
      border: "border-amber-400/15",
    },
    emerald: {
      icon: "bg-emerald-500/12 text-emerald-300",
      badge: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
      border: "border-emerald-400/15",
    },
  }
  return map[color] ?? map["indigo"]!
}

export default function LearnPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
        <div className="eyebrow">Knowledge base</div>
        <h1 className="page-title mt-5">Sell smarter with Finanshels</h1>
        <p className="page-subtitle mt-3 max-w-2xl">
          Everything you need to confidently pitch Finanshels services to your clients — service guides, sales scripts, objection handling, and more.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICE_CATEGORIES.map((cat) => {
            const c = ColorClasses(cat.color)
            return (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${c.icon}`}>
                  <cat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{cat.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-400">{cat.description}</p>
                </div>
              </a>
            )
          })}
        </div>
      </section>

      {/* General sales guide */}
      <section className="surface-card rounded-[2rem] px-6 py-7 sm:px-8" id="sales-guide">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-300">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <div className="eyebrow">General guide</div>
            <h2 className="font-heading text-xl font-semibold text-white">How to sell Finanshels</h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          These principles apply across all service lines — master these and every conversation becomes easier.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {GENERAL_SALES_GUIDE.map((tip) => (
            <div
              key={tip.heading}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-5"
            >
              <p className="text-sm font-semibold text-white">{tip.heading}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{tip.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Service categories */}
      {SERVICE_CATEGORIES.map((cat) => {
        const c = ColorClasses(cat.color)
        return (
          <section key={cat.id} id={cat.id} className="surface-card rounded-[2rem] px-6 py-7 sm:px-8">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${c.icon}`}>
                <cat.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="eyebrow">{cat.title}</div>
                <h2 className="font-heading text-xl font-semibold text-white">{cat.title}</h2>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{cat.description}</p>

            <div className="mt-6 space-y-6">
              {cat.services.map((service) => (
                <div
                  key={service.name}
                  className={`rounded-2xl border bg-white/[0.02] p-5 ${c.border}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-white">{service.name}</h3>
                    <span className={`status-pill border ${c.badge}`}>{cat.title}</span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-300">{service.what}</p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Who needs this
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{service.who}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        How to pitch it
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {service.pitch.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm leading-6 text-slate-400">
                            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {service.objections.length > 0 ? (
                    <div className="mt-4 border-t border-white/6 pt-4">
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5 text-slate-600" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Common objections
                        </p>
                      </div>
                      <div className="mt-3 space-y-3">
                        {service.objections.map((obj, i) => (
                          <div key={i} className="rounded-xl bg-white/[0.03] px-4 py-3">
                            <p className="text-sm font-medium text-slate-300">
                              &ldquo;{obj.q}&rdquo;
                            </p>
                            <p className="mt-1.5 text-sm leading-6 text-slate-400">
                              → {obj.a}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {/* CTA footer */}
      <section className="surface-card rounded-[2rem] px-6 py-7 text-center sm:px-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/12 text-indigo-200">
          <DollarSign className="h-6 w-6" />
        </div>
        <h2 className="mt-5 font-heading text-2xl font-semibold text-white">
          Ready to earn your next commission?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
          Submit a qualified lead now. The more context you provide, the faster our team can qualify it.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard/leads/new" className="primary-button">
            Submit a lead
          </Link>
          <Link href="/dashboard/service-requests/new" className="secondary-button">
            New service request
          </Link>
        </div>
      </section>
    </div>
  )
}
