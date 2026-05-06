# Admin Lead Detail — Customer Information redesign

**Date:** 2026-05-06
**Scope:** `apps/admin/src/app/(dashboard)/leads/[id]/page.tsx` and a new client component in `apps/admin/src/components/`.

## Problem

The Customer Information section on the admin lead detail page mixes three things badly:

1. A read-only `<dl>` grid of customer fields.
2. A giant collapsible "Edit lead details" form on top, with four nested `<details>` blocks (Contact & company, Source & location, Services & notes, Advanced pipeline fields with ~15 sub-fields). Save is at the bottom, far from where editing started.
3. Three separate read-only sibling cards (Source & ownership, Qualification snapshot, Pipeline timestamps) whose fields are actually edited only via the buried "Advanced pipeline fields" collapsible above.

The user has to hunt for which collapsible holds the field they want, scroll down to save, and the read-only display duplicates information from the form.

## Target experience

Mirror the partner profile pattern (`apps/partner/src/components/profile-edit-form.tsx`). Each card is its own inline-editable section:

- Default state: clean read-only field grid.
- Click **Edit** → the same card flips to inputs in place.
- **Cancel / Save** buttons sticky at the top of the card.
- Only changed fields are sent on save; the existing `/api/leads/[id]/details` POST already supports partial updates via `hasField`, so no API change is required.

## Card breakdown

The mega-form is replaced by four independently-editable cards:

| # | Title | Fields |
|---|---|---|
| 1 | Contact & Company | firstName, lastName, customerEmail (required), customerPhone, customerCompany, serviceInterestMulti (multi-select), serviceInterestCustom (textarea), notes (textarea) |
| 2 | Source & Ownership | source, channel, country, city, leadOwner, dealOwner, partnershipManager, appointmentSetter |
| 3 | Qualification | industry, businessInUae (Yes/No), transactionBand, businessArBand, decisionRole, urgencyTimeline, budgetAmount |
| 4 | Pipeline & Proposal | proposalSummary (textarea), proposalAmount, paymentStatus, paymentReference, paymentAmount, stageNotes (textarea), lostReason — followed by a read-only timestamps row (approvedAt, stageUpdatedAt, proposalSentAt, paymentDate, convertedAt) |

The standalone Documents card and the right-column cards (Internal Notes, Referring Partner, status timeline) are out of scope and untouched.

## New component: `LeadEditCard`

Location: `apps/admin/src/components/lead-edit-card.tsx`. Client component (`"use client"`).

Generic, config-driven version of `ProfileEditForm`. Why generic instead of per-section switches: admin has 4 sections with 30+ fields total and the option arrays (`transactionBands`, `decisionRoles`, etc.) are already declared in the page. Passing field configs in keeps the page authoritative for content while the component owns the edit-toggle/save mechanics.

```ts
type FieldDef =
  | { kind: "text" | "email" | "tel" | "number"; name: string; label: string; placeholder?: string; required?: boolean; colSpan?: 1 | 2 }
  | { kind: "select"; name: string; label: string; options: readonly { label: string; value: string }[]; placeholder?: string; colSpan?: 1 | 2 }
  | { kind: "textarea"; name: string; label: string; rows?: number; colSpan?: 1 | 2 }
  | { kind: "multiselect"; name: string; label: string; options: readonly string[]; colSpan?: 1 | 2 }
  | { kind: "readonlyDate"; name: string; label: string; colSpan?: 1 | 2 }
  | { kind: "readonlyTags"; name: string; label: string; colSpan?: 1 | 2 }
  | { kind: "readonlyText"; name: string; label: string; colSpan?: 1 | 2 }

type Props = {
  leadId: string
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  fields: readonly FieldDef[]
  initialValues: Record<string, string | string[] | null>
  canEdit: boolean
}
```

### Behavior

- Owns `isEditing`, `formData`, `error`, `isPending` state internally.
- View mode: renders each field via a small `LeadFieldRow` (label + value, dash if empty, capitalize where relevant, currency formatting for `*Amount` numeric fields, chip rendering for `multiselect`/`readonlyTags`, locale date for `readonlyDate`).
- Edit mode: header swaps to "Editing — make changes below" + Cancel/Save (matches Profile UX). `readonly*` field kinds stay read-only even in edit mode (timestamps).
- Save handler:
  - Build a `FormData` with only the keys that appear in `formData` (i.e. only fields the user actually touched). For `multiselect`, append each selected value as `serviceInterestMulti`.
  - POST to `/api/leads/${leadId}/details` (same endpoint already used by the current mega-form; FormData parsing already implemented).
  - On 4xx/5xx: surface `data.error` inline above the fields. On success: exit edit mode, reset `formData`, call `router.refresh()`.
- `canEdit=false` hides the Edit button entirely.

### Styling

Match the admin app's existing dark palette used throughout the lead detail page (`text-white`, `text-slate-500`, `text-slate-300`, `bg-white/5`, `border-white/10`). Don't blindly copy partner profile's theme tokens — the surrounding page is a different visual language.

Card chrome stays the existing `surface-card rounded-2xl p-6` shell.

## Page changes

Inside `apps/admin/src/app/(dashboard)/leads/[id]/page.tsx`:

- Remove the entire current Customer Information `surface-card` block (the `<details>` mega-form + the read-only `<dl>` grid + the three sibling sub-cards). That's roughly lines 356–935.
- In its place render four `<section className="surface-card rounded-2xl p-6">` blocks, each containing a `<LeadEditCard>` configured for one of the four sections above. The page still owns the option arrays and passes them in as `select` options.
- The Documents card stays put underneath.

## Out of scope

- API changes (`/api/leads/[id]/details` already does partial updates).
- Status / pipeline transition controls (the top status bar with Lead Approved / Follow Up / Qualified pills).
- Right column (Internal Notes, Referring Partner).
- Partner app lead detail page (smaller, separate file, not in the screenshots).

## Risks / things to watch

- `serviceInterestMulti` parsing: the route reads `formData.getAll("serviceInterestMulti")` plus a `serviceInterestCustom` text fallback — both must be sent together. The component will append all currently-selected services on save, even if only `serviceInterestCustom` was edited, so the existing merge logic on the server keeps working.
- `customerEmail` is required server-side; the Contact card's email field stays required and the component blocks save (showing inline error) if cleared.
- `lostReason` + `rejectionReason`: the route mirrors `lostReason` into `rejectionReason` when `lostReason` is sent. Pipeline & Proposal card sends `lostReason` only — same behavior preserved.
