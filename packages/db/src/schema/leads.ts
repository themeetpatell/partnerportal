import { index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { partners } from "./partners"

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id").notNull().references(() => partners.id),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone"),
    customerCompany: text("customer_company"),
    serviceInterest: text("service_interest").notNull().default("[]"), // JSON array
    notes: text("notes"),
    status: text("status").notNull().default("submitted"),
    // submitted | qualified | proposal_sent | deal_won | deal_lost
    source: text("source"), // partner_portal | manual | website | referral | campaign
    channel: text("channel"),
    region: text("region"),
    country: text("country"),
    city: text("city"),
    assignedTo: text("assigned_to"), // team member auth user id
    createdBy: text("created_by"), // auth user id of admin who created on behalf
    onBehalfNote: text("on_behalf_note"), // mandatory note when created by admin
    zohoLeadId: text("zoho_lead_id"),
    zohoDealId: text("zoho_deal_id"),
    crmServicesList: text("crm_services_list").notNull().default("[]"), // JSON array from Zoho CRM deal
    crmProposal: text("crm_proposal"),
    crmAmount: numeric("crm_amount", { precision: 12, scale: 2 }),
    crmClosingDate: text("crm_closing_date"), // ISO date string (YYYY-MM-DD) from Zoho CRM
    crmArAmount: numeric("crm_ar_amount", { precision: 12, scale: 2 }),
    crmIndustry: text("crm_industry"),
    crmPaymentId: text("crm_payment_id"),
    crmPaymentStatus: text("crm_payment_status"),
    crmPaymentRecurring: text("crm_payment_recurring"),
    crmCompanyName: text("crm_company_name"),
    crmServicePeriodStart: text("crm_service_period_start"),
    crmServicePeriodEnd: text("crm_service_period_end"),
    crmPaymentMethod: text("crm_payment_method"),
    crmServiceType: text("crm_service_type"),
    convertedAt: timestamp("converted_at"),
    rejectionReason: text("rejection_reason"),
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
    index("leads_zoho_lead_id_idx").on(table.zohoLeadId),
    index("leads_zoho_deal_id_idx").on(table.zohoDealId),
  ],
)
