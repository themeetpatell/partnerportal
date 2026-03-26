/**
 * Seeds the database with the default Finanshels tenant and starter commission models.
 * Run with: DATABASE_URL=... npx tsx src/seed.ts
 */
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function seed() {
  console.log("🌱 Seeding database...")

  // Default Finanshels tenant
  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      id: "00000000-0000-0000-0000-000000000001",
      name: "Finanshels",
      slug: "finanshels",
      plan: "enterprise",
      isActive: true,
    })
    .onConflictDoNothing()
    .returning()

  if (tenant) {
    console.log("✅ Tenant created:", tenant.slug)
  } else {
    console.log("ℹ️  Tenant already exists, skipping")
  }

  // Starter commission models
  const models = [
    {
      tenantId: "00000000-0000-0000-0000-000000000001",
      name: "Standard 10%",
      type: "flat_pct",
      config: JSON.stringify({ pct: 10 }),
    },
    {
      tenantId: "00000000-0000-0000-0000-000000000001",
      name: "Tiered Commission",
      type: "tiered",
      config: JSON.stringify({
        tiers: [
          { min: 0, max: 5, pct: 8 },
          { min: 6, max: 10, pct: 12 },
          { min: 11, max: null, pct: 15 },
        ],
        period: "monthly",
      }),
    },
    {
      tenantId: "00000000-0000-0000-0000-000000000001",
      name: "Milestone Rewards",
      type: "milestone",
      config: JSON.stringify({
        milestones: [
          { target: 10, reward: 500 },
          { target: 25, reward: 1500 },
          { target: 50, reward: 5000 },
        ],
        currency: "AED",
      }),
    },
  ]

  for (const model of models) {
    const [created] = await db
      .insert(schema.commissionModels)
      .values(model)
      .onConflictDoNothing()
      .returning()
    if (created) console.log("✅ Commission model:", created.name)
  }

  // Starter service catalog
  const services = [
    { name: "Tax Registration (VAT)", category: "Tax", basePrice: "3000" },
    { name: "VAT Filing", category: "Tax", basePrice: "1500" },
    { name: "Bookkeeping (Monthly)", category: "Accounting", basePrice: "2000" },
    { name: "Company Formation", category: "Corporate", basePrice: "5000" },
    { name: "Audit Services", category: "Audit", basePrice: "8000" },
    { name: "CFO Services", category: "Advisory", basePrice: "10000" },
  ]

  for (const svc of services) {
    const [created] = await db
      .insert(schema.services)
      .values({
        tenantId: "00000000-0000-0000-0000-000000000001",
        name: svc.name,
        category: svc.category,
        basePrice: svc.basePrice,
        isActive: true,
      })
      .onConflictDoNothing()
      .returning()
    if (created) console.log("✅ Service:", created.name)
  }

  console.log("\n✨ Seed complete!")
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
