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
      className="mt-5 grid gap-3 border-t border-white/8 pt-5 lg:grid-cols-[1fr_1fr_220px]"
    >
      <input
        type="text"
        name="signedName"
        defaultValue={contactName}
        placeholder="Full legal name"
        required
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500"
      />
      <input
        type="text"
        name="signedDesignation"
        defaultValue={designation ?? ""}
        placeholder="Designation"
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500"
      />
      <select
        name="signatureType"
        value={signatureType}
        onChange={(event) => setSignatureType(event.target.value as "typed" | "upload")}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white"
      >
        <option value="typed">Typed signature</option>
        <option value="upload">Upload signature</option>
      </select>

      {signatureType === "upload" ? (
        <div className="lg:col-span-2">
          <input
            type="file"
            name="signatureFile"
            accept="image/png,image/jpeg,image/webp"
            className="block w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500/15 file:px-3 file:py-2 file:text-indigo-200"
          />
        </div>
      ) : (
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
          Typed signature uses your signer name inside the generated signed PDF. Review the
          prefilled agreement first, then sign here to generate the final signed contract PDF.
        </div>
      )}

      <button type="submit" className="primary-button w-full justify-center">
        Sign agreement
      </button>

      <label className="lg:col-span-3 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
        <input
          type="checkbox"
          name="confirm"
          value="yes"
          required
          className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5"
        />
        <span>
          I confirm that I have reviewed the agreement and I am signing on behalf of this
          partner account.
        </span>
      </label>
    </form>
  )
}