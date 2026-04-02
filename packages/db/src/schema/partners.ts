import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"

export const commissionModels = pgTable("commission_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // flat_pct | tiered | milestone
  config: text("config").notNull(), // JSON string
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull().unique(),

  // Core identity
  type: text("type").notNull(), // referral | channel
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("pending"), // draft | pending | approved | rejected | suspended
  tier: text("tier"), // bronze | silver | gold | platinum
  region: text("region"),
  country: text("country"),
  city: text("city"),
  channel: text("channel"), // manual | website | referral | campaign
  ownerId: uuid("owner_id"), // assigned team member
  agreementUrl: text("agreement_url"),
  zohoSignRequestId: text("zoho_sign_request_id"),
  contractSentAt: timestamp("contract_sent_at"),
  contractStatus: text("contract_status").notNull().default("not_sent"), // not_sent | sent | signed
  contractSignedAt: timestamp("contract_signed_at"),
  contractSignedName: text("contract_signed_name"),
  contractSignedDesignation: text("contract_signed_designation"),
  contractSignatureType: text("contract_signature_type"), // typed | upload
  contractSignatureDataUrl: text("contract_signature_data_url"),
  meetingCompletedAt: timestamp("meeting_completed_at"),
  nurturingStartedAt: timestamp("nurturing_started_at"),

  // Zoho CRM – Primary Information extras
  designation: text("designation"),
  partnershipManager: text("partnership_manager"),
  appointmentsSetter: text("appointments_setter"),
  strategicFunnelStage: text("strategic_funnel_stage"),
  activationDate: timestamp("activation_date"),
  lastMetOn: timestamp("last_met_on"),
  meetingScheduledDateAS: timestamp("meeting_scheduled_date_as"),
  meetingDatePM: timestamp("meeting_date_pm"),
  partnersId: text("partners_id"), // custom Zoho ID

  // Zoho CRM – Secondary Information extras
  partnershipLevel: text("partnership_level"),
  agreementStartDate: timestamp("agreement_start_date"),
  agreementEndDate: timestamp("agreement_end_date"),
  salesTrainingDone: boolean("sales_training_done").default(false),
  dateOfBirth: text("date_of_birth"),
  secondaryEmail: text("secondary_email"),
  emailOptOut: boolean("email_opt_out").default(false),

  // Commercial
  commissionModelId: uuid("commission_model_id").references(() => commissionModels.id),
  commissionType: text("commission_type"), // flat | percentage | tiered
  commissionRate: text("commission_rate"),

  // Business profile
  website: text("website"),
  linkedinId: text("linkedin_id"),
  nationality: text("nationality"),
  businessSize: text("business_size"), // solo | small | medium | large
  partnerIndustry: text("partner_industry"),
  overview: text("overview"),
  partnerAddress: text("partner_address"),

  // Financial / compliance
  vatRegistered: boolean("vat_registered"),
  vatNumber: text("vat_number"),
  tradeLicense: text("trade_license"),
  emirateIdPassport: text("emirate_id_passport"),

  // Bank details
  beneficiaryName: text("beneficiary_name"),
  bankName: text("bank_name"),
  bankCountry: text("bank_country"),
  accountNoIban: text("account_no_iban"),
  swiftBicCode: text("swift_bic_code"),
  paymentFrequency: text("payment_frequency"), // monthly | quarterly | on-request

  // CRM / system
  zohoContactId: text("zoho_contact_id"),
  rejectionReason: text("rejection_reason"),
  suspensionReason: text("suspension_reason"),
  onboardedAt: timestamp("onboarded_at"),
  deletedAt: timestamp("deleted_at"), // soft delete
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull(),
  // admin | appointment_setter | partnership | sales | finance | viewer
  role: text("role").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  designation: text("designation"),
  permissions: text("permissions").notNull().default("{}"), // JSON: { partners: 'rw', leads: 'r', ... }
  rowScope: text("row_scope").notNull().default("all"), // own | team | all
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
