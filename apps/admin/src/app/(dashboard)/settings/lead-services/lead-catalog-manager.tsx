"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import type { LeadCatalogItemRow } from "@repo/db"
import {
  createLeadCatalogItem,
  deleteLeadCatalogItem,
  updateLeadCatalogItem,
} from "./actions"

type Props = {
  initialItems: LeadCatalogItemRow[]
}

export function LeadCatalogManager({ initialItems }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-zinc-100 font-semibold text-sm">Add service</h2>
          <p className="text-zinc-500 text-xs mt-1">
            Appears in partner &amp; admin lead forms when active. Service name is stored on leads verbatim.
          </p>
        </div>
        <form action={createLeadCatalogItem} className="p-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          <div className="sm:col-span-5">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Display name</label>
            <input
              name="name"
              required
              placeholder="e.g. VAT Registration"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Code</label>
            <input
              name="code"
              required
              placeholder="e.g. VATR"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Sort</label>
            <input
              name="sortOrder"
              type="number"
              defaultValue={0}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </form>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-zinc-100 font-semibold text-sm">Catalog ({initialItems.length})</h2>
            <p className="text-zinc-500 text-xs mt-1">Inactive rows stay on historical leads but hide from new submissions.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Sort</th>
                <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Active</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {initialItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    No catalog rows yet. Add a service above or run database migrations / seed.
                  </td>
                </tr>
              ) : (
                initialItems.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((current) => (current === row.id ? null : row.id))
                        }
                        className="text-left text-zinc-200 font-medium hover:text-white transition-colors"
                      >
                        {row.name}
                      </button>
                      {expandedId === row.id ? (
                        <form action={updateLeadCatalogItem.bind(null, row.id)} className="mt-3 space-y-3">
                          <div>
                            <label className="block text-[11px] text-zinc-500 mb-1">Display name</label>
                            <input
                              name="name"
                              required
                              defaultValue={row.name}
                              className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                            />
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <div>
                              <label className="block text-[11px] text-zinc-500 mb-1">Code</label>
                              <input
                                name="code"
                                required
                                defaultValue={row.code}
                                className="w-40 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-zinc-500 mb-1">Sort</label>
                              <input
                                name="sortOrder"
                                type="number"
                                defaultValue={row.sortOrder}
                                className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-zinc-500 mb-1">Active</label>
                              <select
                                name="isActive"
                                defaultValue={row.isActive ? "true" : "false"}
                                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                              >
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white"
                            >
                              Save changes
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 tabular-nums">{row.code}</td>
                    <td className="px-6 py-4 text-zinc-400">{row.sortOrder}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          row.isActive
                            ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/40"
                            : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                        }`}
                      >
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <form action={deleteLeadCatalogItem.bind(null, row.id)} className="inline">
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-950/70"
                          title="Remove from catalog (historical lead values unchanged)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
