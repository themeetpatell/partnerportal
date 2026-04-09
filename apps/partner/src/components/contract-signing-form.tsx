"use client"

import { useState } from "react"

export function ContractSigningForm({
  contactName,
  designation,
}: {
  contactName: string
  designation: string | null
}) {
  const [signatureType, setSignatureType] = useState<"typed" | "upload">("typed")

  return (
    <form
      action="/api/profile/contract"
      method="POST"
      encType="multipart/form-data"
      className="mt-5 grid gap-3 border-t border-border pt-5 lg:grid-cols-[1fr_1fr_220px]"
    >
      <input
        type="text"
        name="signedName"
        defaultValue={contactName}
        placeholder="Full legal name"
        required
        className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
      />
      <input
        type="text"
        name="signedDesignation"
        defaultValue={designation ?? ""}
        placeholder="Designation"
        className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
      />
      <select
        name="signatureType"
        value={signatureType}
        onChange={(event) => setSignatureType(event.target.value as "typed" | "upload")}
        className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground"
      >
        <option value="typed">Typed signature</option>
        <option value="upload">Upload signature</option>
      </select>

      {signatureType === "upload" ? (
        <div className="lg:col-span-2">
          <input
            type="file"
            name="signatureFile"
            accept="image/png,image/jpeg"
            className="block w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-[var(--portal-text-soft)] file:mr-3 file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-2 file:text-primary"
          />
        </div>
      ) : (
        <div className="lg:col-span-2 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-[var(--portal-text-soft)]">
          Typed signature uses your authorised signatory name inside the generated signed PDF.
          Review the prefilled agreement first, then sign here to finalize the in-app contract.
        </div>
      )}

      <button type="submit" className="primary-button w-full justify-center">
        Sign agreement in portal
      </button>

      <label className="lg:col-span-3 flex items-start gap-3 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-[var(--portal-text-soft)]">
        <input
          type="checkbox"
          name="confirm"
          value="yes"
          required
          className="mt-1 h-4 w-4 rounded border-border bg-secondary"
        />
        <span>
          I confirm that I have reviewed the agreement and I am authorized to sign on behalf of this
          partner entity.
        </span>
      </label>
    </form>
  )
}
