import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { partners, teamMembers } from "./partners"
import { leads } from "./leads"

export const crmActivities = pgTable(
  "crm_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    activityType: text("activity_type").notNull(),
    subject: text("subject").notNull(),
    description: text("description"),
    scheduledAt: timestamp("scheduled_at").notNull(),
    endAt: timestamp("end_at"),
    durationMinutes: integer("duration_minutes"),
    location: text("location"),
    meetingUrl: text("meeting_url"),
    outcome: text("outcome"),
    status: text("status").notNull().default("scheduled"),
    assignedToTeamMemberId: uuid("assigned_to_team_member_id").references(
      () => teamMembers.id,
      { onDelete: "set null" },
    ),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("crm_activities_tenant_partner_scheduled_idx").on(
      table.tenantId,
      table.partnerId,
      table.scheduledAt,
    ),
    index("crm_activities_tenant_assigned_scheduled_idx").on(
      table.tenantId,
      table.assignedToTeamMemberId,
      table.scheduledAt,
    ),
  ],
)
