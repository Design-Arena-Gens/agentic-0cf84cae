'use client';

import type { Broadcast, DeliveryLogEntry } from "@/lib/types";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

interface DeliveryTimelineProps {
  broadcasts: Broadcast[];
  deliveries: DeliveryLogEntry[];
}

const statusColors: Record<string, string> = {
  pending: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  sending: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200",
  delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200",
};

export function DeliveryTimeline({ broadcasts, deliveries }: DeliveryTimelineProps) {
  if (!broadcasts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="font-medium text-zinc-700 dark:text-zinc-200">No broadcasts launched yet.</p>
        <p className="mt-2 text-xs">Schedule or send a broadcast to see real-time delivery activity here.</p>
      </div>
    );
  }

  const groupedDeliveries = deliveries.reduce<Record<string, DeliveryLogEntry[]>>((acc, delivery) => {
    if (!acc[delivery.broadcastId]) {
      acc[delivery.broadcastId] = [];
    }
    acc[delivery.broadcastId].push(delivery);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      {broadcasts
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((broadcast) => {
          const metrics = groupedDeliveries[broadcast.id] ?? [];
          const delivered = metrics.filter((entry) => entry.status === "delivered").length;
          const failed = metrics.filter((entry) => entry.status === "failed").length;
          const pending = metrics.filter((entry) => entry.status === "pending" || entry.status === "sending").length;
          return (
            <article
              key={broadcast.id}
              className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {broadcast.label}
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    {broadcast.totalRecipients} recipients · {formatDateTime(broadcast.scheduledFor)}
                  </p>
                </div>
                <div className="flex gap-2 text-[11px] font-semibold uppercase tracking-wide">
                  <span className={`rounded-full px-3 py-1 ${statusColors.delivered}`}>Delivered {delivered}</span>
                  <span className={`rounded-full px-3 py-1 ${statusColors.failed}`}>Failed {failed}</span>
                  {pending ? (
                    <span className={`rounded-full px-3 py-1 ${statusColors.pending}`}>Queued {pending}</span>
                  ) : null}
                </div>
              </header>
              <ul className="mt-4 flex flex-col gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                {metrics
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(a.completedAt ?? a.startedAt ?? a.scheduledFor ?? broadcast.createdAt).getTime() -
                      new Date(b.completedAt ?? b.startedAt ?? b.scheduledFor ?? broadcast.createdAt).getTime(),
                  )
                  .slice(-6)
                  .reverse()
                  .map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950/40"
                    >
                      <div>
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">{entry.contactName}</p>
                        <p className="text-xs text-zinc-400">{entry.phone}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusColors[entry.status]}`}>
                          {entry.status}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                          {formatRelativeTime(entry.completedAt ?? entry.startedAt ?? broadcast.createdAt)}
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            </article>
          );
        })}
    </div>
  );
}
