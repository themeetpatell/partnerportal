import { db, activityTimelines } from "@repo/db"
import { and, eq, desc } from "drizzle-orm"
import { Clock, User, Plus, RefreshCw, FileText, AlertCircle } from "lucide-react"

const ACTION_ICONS: Record<string, React.ElementType> = {
  created: Plus,
  status_changed: RefreshCw,
  note_added: FileText,
  approved: User,
  rejected: AlertCircle,
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString("en-AE", { day: "numeric", month: "short" })
}

interface Props {
  entityType: string
  entityId: string
  limit?: number
}

export async function ActivityTimeline({ entityType, entityId, limit = 20 }: Props) {
  const events = await db
    .select()
    .from(activityTimelines)
    .where(
      and(
        eq(activityTimelines.entityType, entityType),
        eq(activityTimelines.entityId, entityId)
      )
    )
    .orderBy(desc(activityTimelines.createdAt))
    .limit(limit)

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-zinc-600 text-sm">No activity yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const Icon = ACTION_ICONS[event.action] ?? Clock
        const isLast = i === events.length - 1
        return (
          <div key={event.id} className="flex gap-3">
            {/* Timeline line + icon */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-zinc-800 my-1" />}
            </div>

            {/* Content */}
            <div className={`pb-4 flex-1 min-w-0 ${isLast ? "" : ""}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-300 text-sm font-medium">{event.actorName}</span>
                <span className="text-zinc-500 text-xs capitalize">
                  {event.action.replace(/_/g, " ")}
                </span>
                <span className="text-zinc-600 text-xs ml-auto flex-shrink-0">
                  {timeAgo(new Date(event.createdAt))}
                </span>
              </div>
              {event.note && (
                <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{event.note}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
