import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"
import { isNotNull } from "drizzle-orm"
import { tenants } from "./tenants"
import { partners } from "./partners"

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id").notNull().references(() => partners.id),
    customerName: text("customer_name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone"),
    customerCompany: text("customer_company"),
    serviceInterest: text("service_interest").notNull().default("[]"), // JSON array
    notes: text("notes"),
    status: text("status").notNull().default("submitted"),
    // submitted | lead_approved | lead_follow_up | lead_qualified | proposal_sent | deal_won | deal_lost
    source: text("source"), // partner_portal | manual | website | referral | campaign
    channel: text("channel"),
    region: text("region"), // legacy optional field
    country: text("country"),
    city: text("city"),
    assignedTo: text("assigned_to"), // team member auth user id
    leadOwner: text("lead_owner"), // display / CRM sync
    dealOwner: text("deal_owner"),
    /** Supabase auth user id — Pre-sales (lead owner) */
    leadOwnerUserId: text("lead_owner_user_id"),
    /** Supabase auth user id — Sales / deal owner */
    dealOwnerUserId: text("deal_owner_user_id"),
    partnershipManager: text("partnership_manager"),
    appointmentSetter: text("appointment_setter"),
    industry: text("industry"),
    businessInUae: text("business_in_uae"), // yes | no
    transactionBand: text("transaction_band"),
    businessArBand: text("business_ar_band"),
    decisionRole: text("decision_role"),
    urgencyTimeline: text("urgency_timeline"),
    budgetAmount: numeric("budget_amount", { precision: 12, scale: 2 }),
    lostReason: text("lost_reason"),
    createdBy: text("created_by"), // auth user id of admin who created on behalf
    onBehalfNote: text("on_behalf_note"), // mandatory note when created by admin
    approvedAt: timestamp("approved_at"),
    approvedBy: text("approved_by"), // auth user id of approver
    stageUpdatedAt: timestamp("stage_updated_at"),
    stageNotes: text("stage_notes"),
    proposalSummary: text("proposal_summary"),
    proposalAmount: numeric("proposal_amount", { precision: 12, scale: 2 }),
    proposalSentAt: timestamp("proposal_sent_at"),
    paymentStatus: text("payment_status"), // pending | paid | failed
    paymentReference: text("payment_reference"),
    paymentAmount: numeric("payment_amount", { precision: 12, scale: 2 }),
    /** monthly | quarterly | annually | bi_annual — drives automated recurring commission rows */
    paymentRecurring: text("payment_recurring"),
    paymentDate: timestamp("payment_date"),
    convertedAt: timestamp("converted_at"),
    rejectionReason: text("rejection_reason"),
    /** new_lead | existing_lead — existing = follow-on from a won client (replaces cross-sell service requests). */
    intakeType: text("intake_type").notNull().default("new_lead"),
    /** When intake is existing_lead, optional link to the original won lead / account. */
    sourceLeadId: uuid("source_lead_id").references((): AnyPgColumn => leads.id, {
      onDelete: "set null",
    }),
    /** Populated when this row was migrated from `service_requests` (stable redirect / audit). */
    legacyServiceRequestId: uuid("legacy_service_request_id"),
    deletedAt: timestamp("deleted_at"), // soft delete
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("leads_partner_deleted_created_idx").on(
      table.partnerId,
      table.deletedAt,
      table.createdAt,
    ),
    index("leads_status_idx").on(table.status),
    index("leads_tenant_deleted_created_idx").on(
      table.tenantId,
      table.deletedAt,
      table.createdAt,
    ),
    index("leads_customer_email_idx").on(table.customerEmail),
    index("leads_intake_type_idx").on(table.intakeType),
    uniqueIndex("leads_legacy_service_request_id_unique")
      .on(table.legacyServiceRequestId)
      .where(isNotNull(table.legacyServiceRequestId)),
  ],
)

export const leadNotes = pgTable(
  "lead_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
    authorId: text("author_id"),
    authorName: text("author_name"),
    note: text("note").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("lead_notes_lead_created_idx").on(table.leadId, table.createdAt),
    index("lead_notes_tenant_created_idx").on(table.tenantId, table.createdAt),
  ],
)
