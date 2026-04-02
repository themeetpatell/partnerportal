# Finanshels Admin Portal — User Guide

> Complete operational guide for administrators managing the Finanshels Partner Portal.

---

## Table of Contents

1. [Overview & Access](#1-overview--access)
2. [Dashboard (Home)](#2-dashboard-home)
3. [Partner Management](#3-partner-management)
4. [Lead Pipeline](#4-lead-pipeline)
5. [Service Requests](#5-service-requests)
6. [Commissions & Payouts](#6-commissions--payouts)
7. [Invoicing](#7-invoicing)
8. [Analytics & Reporting](#8-analytics--reporting)
9. [Users & Access Control](#9-users--access-control)
10. [Role Permissions Matrix](#10-role-permissions-matrix)
11. [API Reference (Admin Endpoints)](#11-api-reference-admin-endpoints)

---

## 1. Overview & Access

### Who Should Use This Portal

The admin portal is for the Finanshels internal team. Users are assigned one of these roles:

| Role | Access Level |
|------|-------------|
| **Admin** | Full access to all modules — partners, leads, services, invoices, commissions, users, analytics |
| **Partnership** | Partners (R/W), leads (R/W), services (R/W), invoices (R), commissions (R), users (R), analytics (R) |
| **Sales** | Partners (R), leads (R/W), services (R), invoices (R), commissions (R), analytics (R) |
| **Appointment Setter** | Partners (R), leads (R/W) — no access to invoices, commissions, users |
| **Finance** | Partners (R), leads (R), services (R), invoices (R/W), commissions (R/W), analytics (R) |
| **Viewer** | Read-only across all modules except users |

### Accessing the Portal

- **URL**: Your admin portal URL (e.g., `https://admin.finanshels.com`)
- **Authentication**: Clerk auth — only `/sign-in` is public, all other routes require authentication
- **Row Scope**: Users can be scoped to "all records", "team records", or "own records only"

---

## 2. Dashboard (Home)

### KPI Summary Cards

| Metric | Description |
|--------|-------------|
| **Total Partners** | All registered partner accounts |
| **Pending Approvals** | Partners awaiting admin review |
| **Total Leads** | All leads across all partners |
| **Submitted Leads** | New leads not yet reviewed |
| **Pending Commissions** | Total AED value of unsettled commissions |

### Quick Views

**Pending Partner Approvals** — Shows the 5 most recent partner applications needing review, with:
- Company name, contact name, partner type, submission date
- Click any row to go to the partner detail page for review

**Recent Leads** — Shows the 5 most recent leads across all partners, with:
- Customer name, company, services interested in, status
- Direct link to lead detail for pipeline management

---

## 3. Partner Management

### Partners List

**Path**: Sidebar → Partners

**Filter Tabs**:
- **All** — Every partner in the system
- **Active Partner** — Partners with recent lead activity (within 60 days)
- **Inactive Partner** — Partners with no lead activity for 90+ days
- **Yet To Activate** — Approved but haven't submitted their first lead
- **Yet To Onboard** — Still in onboarding process

**Columns**: Company Name, Contact, Partner Type, Registration Status, Operational Status, Created Date

### Creating a New Partner (Manual)

**Path**: Partners → New Partner

Use this when a partner doesn't self-register through the portal. Fields:

| Section | Fields |
|---------|--------|
| **Company Info** | Company name*, contact name*, email*, phone |
| **Classification** | Partner type* (referral/channel), tier, channel source, initial status |
| **Location** | Region, country, city |
| **Agreement** | Agreement URL (optional link to external doc) |

> **Note**: Manually created partners get a placeholder Clerk user ID. They won't be able to log in until linked to a real Clerk account.

### Partner Detail Page

**Path**: Partners → [Click partner name]

#### What You'll See

**Header**: Company name, contact info, partner type badge, registration status badge, operational status, onboarding stage

**Action Buttons** (based on current state):
- **Approve** — For pending partners → sets status to "approved", sends welcome email
- **Reject** — With optional reason → sends rejection email
- **Send Contract** — Generates and delivers agreement for signing
- **Mark Meeting Done** — Records kickoff meeting completion
- **Mark Onboarded** — Requires signed contract first
- **Start Nurturing** — Moves to nurturing stage
- **Suspend / Reactivate** — Pause or restore partner access

**Sections**:
1. **Primary Info**: Company, contact, email, phone, designation, partner type, tier
2. **CRM / Internal**: Partnership manager, appointment setter, funnel stage, activation date, meeting dates, partner ID
3. **Secondary/Admin**: Partnership level, agreement dates, sales training, email opt-out
4. **Commission**: Commission type and rate
5. **About & Online**: Website, LinkedIn, nationality, business size, industry, overview, address
6. **Financial & Compliance**: VAT registration, VAT number, trade license, Emirates ID
7. **Banking & Payout**: Beneficiary, bank name, bank country, IBAN, SWIFT/BIC, payment frequency

**Associated Data**: Documents (signed agreements, uploaded files), leads submitted by this partner, commission totals

#### Editing Partner Information

Click **Edit** on the detail page. Admin can modify ALL fields including:
- Partner-managed fields (company info, banking details)
- Admin-only fields (CRM management, commission settings, partnership level, meeting dates)

Changes are logged to the activity timeline with the admin user's name.

### Partner Lifecycle Flow

```
Application → Pending Review
  ↓ Approve                ↓ Reject
Approved                 Rejected (with reason)
  ↓ Send Contract
Contract Sent
  ↓ Partner Signs (self-service)
Contract Signed
  ↓ Mark Meeting Done
Meeting Done
  ↓ Mark Onboarded
Onboarded
  ↓ Start Nurturing
Nurturing
  ↓ First Lead Submitted
Activated (Auto)
```

**Operational Status** (auto-derived):
- **Active Partner**: Has a qualified lead within the last 60 days
- **Inactive Partner**: No leads for 90+ days
- **Yet to Activate**: Approved/onboarded but no leads yet
- **Yet to Onboard**: Still in onboarding pipeline

---

## 4. Lead Pipeline

### Leads List

**Path**: Sidebar → Leads

**Filter Tabs**: All, Submitted, In Review, Qualified, Proposal Sent, Converted, Rejected

**Columns**: Customer Name/Email, Partner Company/Contact, Services Interested, Status, Date, Assigned To, Actions

### Creating a Lead (On Behalf of Partner)

**Path**: Leads → New Lead

Required fields:
- Partner (select from dropdown)
- Customer name and email
- **On-behalf note** (mandatory — explain why admin is creating this)

Optional fields: Phone, company, service interest, source, channel, region, assigned team member, notes

> **Duplicate Detection**: The system checks for existing leads with the same email/phone for the selected partner and shows a warning with a link to the existing lead.

### Lead Detail & Status Transitions

**Path**: Leads → [Click lead row]

**Allowed Status Flow**:

| Current Status | Can Transition To |
|---------------|-------------------|
| Submitted | In Review |
| In Review | Qualified, Rejected |
| Qualified | Proposal Sent, Rejected |
| Proposal Sent | Converted, Rejected |
| Converted | — (terminal) |
| Rejected | — (terminal) |

**On Conversion**: 
- `convertedAt` timestamp is set
- Commission is **automatically calculated** using the partner's commission model
- Commission record created with "pending" status
- Partner receives an email notification

**On Rejection**:
- Optional rejection reason can be provided
- `rejectionReason` stored on the lead

### Email Notifications

Status changes trigger automatic email to the partner with the updated status.

---

## 5. Service Requests

### Service Requests List

**Path**: Sidebar → Service Requests

**Filter Tabs**: All, Pending, In Progress, Completed, Cancelled

**Columns**: Customer Company/Contact, Partner Company, Service Name/Category, Status, Assigned To, Start Date, Created Date

### Creating a Service Request

**Path**: Service Requests → New

Required fields:
- Partner (dropdown)
- Service (dropdown from catalog)
- Customer company, contact, email
- **On-behalf note** (mandatory)

Optional fields: Linked lead, pricing (AED), start/end dates, assigned team member, notes

> **Lead Linking**: When you select a lead, customer details are auto-filled and the partner is pre-selected.

### Service Statuses

| Status | Meaning |
|--------|---------|
| Pending | Submitted, awaiting team pickup |
| In Progress | Team is delivering the service |
| Completed | Successfully delivered |
| Cancelled | Cancelled before completion |

---

## 6. Commissions & Payouts

### Commissions List

**Path**: Sidebar → Commissions

**Summary Cards**: Total Pending (AED), Total Approved (AED), Total Paid (AED)

**Filter Tabs**: Pending, Approved, Paid

**Columns**: Partner Name/Contact, Source Type/ID, Amount (AED), Status, Calculated Date

### Commission Workflow

```
Lead Converts → Commission Auto-Calculated (Pending)
  ↓ Admin Approves
Approved
  ↓ Finance Processes
Processing
  ↓ Settlement
Paid
```

### Approving a Commission

On the commissions page, click **Approve** on a pending commission. This:
1. Changes status to "approved"
2. Sets `approvedAt` timestamp
3. Sends notification email to the partner
4. Redirects back to the commissions list

### Commission Calculation

When a lead converts, the system:
1. Looks up the partner's commission model
2. Counts prior conversions (for tiered models)
3. Applies a default service fee (AED 5,000 — placeholder until service request pricing is linked)
4. Creates a commission record with the calculated amount and breakdown

**Commission Model Types**:
- **Flat Percentage**: Fixed % of service fee
- **Tiered**: Different % based on conversion count ranges
- **Milestone**: Bonus amounts at specific conversion thresholds

---

## 7. Invoicing

### Invoices List

**Path**: Sidebar → Invoices

**Summary Cards**: Outstanding (Sent), Collected (Paid), Overdue

**Filter Tabs**: All, Draft, Sent, Paid, Overdue

**Columns**: Invoice Number (e.g., INV-00001), Partner Name/Contact, Amount + Currency, Status, Due Date, Paid Date

### Creating an Invoice

**Path**: Invoices → New

| Section | Fields |
|---------|--------|
| **Recipient** | Partner* (dropdown), Linked Service Request (optional) |
| **Billing Period** | Period start*, period end*, due date*, payment terms |
| **Financials** | Subtotal*, discount, tax, currency (AED/USD/EUR/GBP/SAR) |
| **Options** | Initial status (draft/sent), payment notes |

The **total** is calculated automatically: Total = Subtotal - Discount + Tax

Invoice numbers are auto-generated sequentially (INV-00001, INV-00002, etc.).

### Invoice Statuses

| Status | Meaning |
|--------|---------|
| Draft | Created but not sent to partner |
| Sent | Delivered to partner, `issuedAt` set |
| Paid | Payment received |
| Overdue | Past due date, unpaid |
| Cancelled | Voided |

---

## 8. Analytics & Reporting

### Analytics Dashboard

**Path**: Sidebar → Analytics

The analytics page provides multi-section reporting:

#### Global Filters
- **Date Presets**: Today, Yesterday, This Week, Last Week, This Month, Last Month, This Quarter, Last Quarter, This Year, All Time
- Filters persist in the URL (shareable links)

#### Report Sections

**1. Pipeline Overview** — Lead conversion funnel metrics
- Filters: Lead source, lead status
- Metrics: Total leads, conversion rate, average time to convert

**2. Delivery & SLA** — Service request performance
- Filters: Service status, SLA status
- Metrics: Active requests, completed rate, SLA adherence

**3. Partner Report** — Partner performance analysis
- Filters: Partner type, partner tier
- Metrics: Active partners, leads per partner, conversion per partner

**4. Finance Report** — Revenue and commission tracking
- Filters: Invoice status, commission status
- Metrics: Total revenue, outstanding invoices, commission payouts

### CSV Export

Click the **Export** button on the analytics page to download a CSV report containing:
- **Leads section**: ID, customer name/email/company, partner type, status, created date
- **Service Requests section**: ID, customer company, partner type, status, SLA status, pricing, date
- **Invoices section**: Invoice number, partner type, status, total, due date, paid date

Parameters: Date range, partner ID, partner type, lead status/source, service status, team member

---

## 9. Users & Access Control

### Team Members List

**Path**: Sidebar → Settings → Users & Access

**Columns**: Name/Email/Phone, Designation, Role (badge), Scope, Status (Active/Inactive), Join Date

**Actions per User**: Edit role/scope/permissions, activate/deactivate

### Adding a Team Member

**Path**: Settings → Users → Add Team Member

| Field | Required? | Description |
|-------|-----------|-------------|
| Name | Yes | Full name |
| Email | Yes | Work email |
| Phone | No | Contact number |
| Designation | No | Job title |
| Role | Yes | Select from: Admin, Partnership, Sales, Appointment Setter, Finance, Viewer |
| Row Scope | No | All records (default), Team records, Own records only |

> **Note**: New team members are created with a placeholder identity. They need to be linked to a Clerk account for actual portal access.

### Editing User Access

Admin can update:
- Role assignment
- Row scope (all/team/own)
- Custom permissions (override default role matrix)
- Active/inactive toggle

---

## 10. Role Permissions Matrix

| Module | Admin | Partnership | Sales | Appt. Setter | Finance | Viewer |
|--------|-------|------------|-------|--------------|---------|--------|
| Partners | R/W | R/W | R | R | R | R |
| Leads | R/W | R/W | R/W | R/W | R | R |
| Services | R/W | R/W | R | — | R | R |
| Invoices | R/W | R | R | — | R/W | R |
| Commissions | R/W | R | R | — | R/W | R |
| Users | R/W | R | — | — | — | — |
| Analytics | R | R | R | — | R | R |

**Legend**: R = Read, W = Write, R/W = Read + Write, — = No access

---

## 11. API Reference (Admin Endpoints)

### Partner APIs

| Method | Endpoint | Purpose | Roles |
|--------|----------|---------|-------|
| POST | `/api/admin/partners` | Create partner manually | Admin, Partnership |
| PATCH | `/api/partners/[id]` | Update partner fields | Admin, Partnership |
| POST | `/api/partners/[id]/approve` | Approve pending partner | Any authenticated |
| POST | `/api/partners/[id]/reject` | Reject partner (with reason) | Any authenticated |
| POST | `/api/partners/[id]/lifecycle` | Execute lifecycle action | Any authenticated |

### Lead APIs

| Method | Endpoint | Purpose | Roles |
|--------|----------|---------|-------|
| POST | `/api/admin/leads` | Create lead on behalf of partner | Admin, Partnership, Sales, Appt. Setter |
| POST | `/api/leads/[id]/status` | Transition lead status | Any authenticated |

### Service Request APIs

| Method | Endpoint | Purpose | Roles |
|--------|----------|---------|-------|
| POST | `/api/admin/service-requests` | Create SR on behalf of partner | Admin, Partnership, Sales |

### Invoice APIs

| Method | Endpoint | Purpose | Roles |
|--------|----------|---------|-------|
| POST | `/api/admin/invoices` | Create invoice | Admin, Finance |

### Commission APIs

| Method | Endpoint | Purpose | Roles |
|--------|----------|---------|-------|
| POST | `/api/commissions/[id]/approve` | Approve pending commission | Any authenticated |

### User APIs

| Method | Endpoint | Purpose | Roles |
|--------|----------|---------|-------|
| GET | `/api/admin/users` | List team members | Any authenticated |
| POST | `/api/admin/users` | Create team member | Admin only |
| PATCH | `/api/admin/users?id=X` | Update user role/scope | Admin only |

### Utility APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/saved-filters` | Save analytics filter preset |
| DELETE | `/api/admin/saved-filters?id=X` | Delete saved filter |
| GET | `/api/admin/analytics/export` | Export analytics CSV |
| GET | `/api/documents/[id]/download` | Download stored document |

---

*Last updated: March 2026*
