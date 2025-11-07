'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import type { Broadcast, Contact, DeliveryLogEntry, MessageTemplate } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

interface BroadcastComposerProps {
  contacts: Contact[];
  templates: MessageTemplate[];
  selectedTemplateId: string | null;
  message: string;
  onMessageChange: (value: string) => void;
  broadcastLabel: string;
  onBroadcastLabelChange: (value: string) => void;
  scheduledFor: string | null;
  onScheduleChange: (iso: string | null) => void;
  audienceTag: string | null;
  onAudienceTagChange: (tag: string | null) => void;
  onLaunchBroadcast: (broadcast: Broadcast, deliveries: DeliveryLogEntry[]) => void;
  existingBroadcasts: Broadcast[];
  isProcessing: boolean;
}

const personaliseMessage = (template: string, contact: Contact) => {
  const [firstName, ...rest] = contact.name.trim().split(" ");
  const company = contact.tags.find((tag) => tag.toLowerCase().includes("company")) ?? contact.tags[0] ?? "your team";

  return template
    .replace(/{{\s*firstName\s*}}/gi, firstName ?? contact.name)
    .replace(/{{\s*fullName\s*}}/gi, contact.name)
    .replace(/{{\s*company\s*}}/gi, company)
    .replace(/{{\s*notes\s*}}/gi, contact.notes ?? "")
    .replace(/{{\s*tag\s*}}/gi, contact.tags[0] ?? "")
    .replace(/{{\s*phone\s*}}/gi, contact.phone);
};

export function BroadcastComposer({
  contacts,
  templates,
  selectedTemplateId,
  message,
  onMessageChange,
  broadcastLabel,
  onBroadcastLabelChange,
  scheduledFor,
  onScheduleChange,
  audienceTag,
  onAudienceTagChange,
  onLaunchBroadcast,
  existingBroadcasts,
  isProcessing,
}: BroadcastComposerProps) {
  const [audienceMode, setAudienceMode] = useState<"all" | "tag">("all");
  const [acknowledgedCompliance, setAcknowledgedCompliance] = useState(false);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;

  useEffect(() => {
    if (selectedTemplate && !message.length) {
      onMessageChange(selectedTemplate.body);
    }
  }, [message.length, onMessageChange, selectedTemplate]);

  const tags = useMemo(() => {
    const unique = new Set<string>();
    contacts.forEach((contact) =>
      contact.tags.forEach((tag) => {
        if (tag) unique.add(tag);
      }),
    );
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [contacts]);

  const optedInContacts = useMemo(
    () => contacts.filter((contact) => contact.optIn),
    [contacts],
  );

  const filteredContacts = useMemo(() => {
    if (audienceMode === "tag" && audienceTag) {
      return optedInContacts.filter((contact) =>
        contact.tags.some((tag) => tag.toLowerCase() === audienceTag.toLowerCase()),
      );
    }
    return optedInContacts;
  }, [audienceMode, audienceTag, optedInContacts]);

  const previewMessage = useMemo(() => {
    if (!filteredContacts.length || !message.trim()) return "";
    return personaliseMessage(message, filteredContacts[0]);
  }, [filteredContacts, message]);

  const totalDeliveriesScheduled = existingBroadcasts.reduce(
    (count, broadcast) => count + broadcast.totalRecipients,
    0,
  );

  const handleScheduleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (!value) {
      onScheduleChange(null);
      return;
    }
    const date = new Date(value);
    onScheduleChange(Number.isNaN(date.getTime()) ? null : date.toISOString());
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!broadcastLabel.trim()) return;
    if (!message.trim()) return;
    if (!acknowledgedCompliance) return;
    if (!filteredContacts.length) return;

    const isoNow = new Date().toISOString();
    const broadcast: Broadcast = {
      id: nanoid(),
      label: broadcastLabel.trim(),
      templateId: selectedTemplate?.id ?? "custom",
      target: audienceMode === "tag" ? { tag: audienceTag } : { contactIds: filteredContacts.map((c) => c.id) },
      scheduledFor: scheduledFor,
      createdAt: isoNow,
      status: scheduledFor ? "scheduled" : "in_progress",
      totalRecipients: filteredContacts.length,
      delivered: 0,
      failed: 0,
    };

    const deliveries: DeliveryLogEntry[] = filteredContacts.map((contact, index) => ({
      id: nanoid(),
      broadcastId: broadcast.id,
      contactId: contact.id,
      contactName: contact.name,
      phone: contact.phone,
      scheduledFor: scheduledFor,
      status: "pending",
      preview: personaliseMessage(message, contact),
      startedAt: undefined,
      completedAt: undefined,
      error: undefined,
    }));

    onLaunchBroadcast(broadcast, deliveries);
    setAcknowledgedCompliance(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="md:col-span-2 text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
          Broadcast label
          <input
            value={broadcastLabel}
            onChange={(event) => onBroadcastLabelChange(event.target.value)}
            placeholder="Q2 onboarding follow-up"
            className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
            required
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
          Schedule
          <input
            type="datetime-local"
            value={scheduledFor ? new Date(scheduledFor).toISOString().slice(0, 16) : ""}
            onChange={handleScheduleChange}
            className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-900/60 dark:bg-emerald-900/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              Audience
            </h3>
            <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-200/80">
              {filteredContacts.length} recipients ({optedInContacts.length} opted in total)
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-300 bg-white/60 px-2 py-1 text-xs dark:border-emerald-800 dark:bg-emerald-950">
            <button
              type="button"
              onClick={() => setAudienceMode("all")}
              className={`rounded-full px-3 py-1 font-medium transition ${
                audienceMode === "all" ? "bg-emerald-600 text-white shadow" : "text-emerald-700 dark:text-emerald-200"
              }`}
            >
              All opted-in
            </button>
            <button
              type="button"
              onClick={() => setAudienceMode("tag")}
              className={`rounded-full px-3 py-1 font-medium transition ${
                audienceMode === "tag" ? "bg-emerald-600 text-white shadow" : "text-emerald-700 dark:text-emerald-200"
              }`}
            >
              Filter by tag
            </button>
          </div>
        </div>
        {audienceMode === "tag" ? (
          <div className="mt-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
              Target tag
              <select
                value={audienceTag ?? ""}
                onChange={(event) => onAudienceTagChange(event.target.value || null)}
                className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
                required
              >
                <option value="">Select a tag</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
          WhatsApp message
          <textarea
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder="Hey {{firstName}}, we opened a few more seats for the workshop at 11:30am. Want in?"
            className="mt-1 min-h-[180px] w-full rounded-2xl border border-emerald-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
            required
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-wide text-zinc-500">
          <span>{message.trim().length} characters</span>
          <span>{message.trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
      </div>

      {previewMessage ? (
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 text-sm shadow-inner dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
            <span>Preview</span>
            <span className="text-zinc-400">·</span>
            <span>{filteredContacts[0]?.name}</span>
            <span className="text-zinc-400">·</span>
            <span>{formatDateTime(scheduledFor)}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">{previewMessage}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-[13px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={acknowledgedCompliance}
            onChange={(event) => setAcknowledgedCompliance(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border border-emerald-300 text-emerald-600 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-emerald-950"
          />
          <span>
            I confirm everyone in this broadcast explicitly opted in to receive WhatsApp communications, and this message follows Meta's business policies.
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-zinc-500">
          <span>{existingBroadcasts.length} broadcasts staged</span>
          <span>·</span>
          <span>{totalDeliveriesScheduled} total deliveries</span>
        </div>
        <button
          type="submit"
          disabled={
            isProcessing ||
            !filteredContacts.length ||
            !message.trim().length ||
            !broadcastLabel.trim().length ||
            !acknowledgedCompliance ||
            (audienceMode === "tag" && !audienceTag)
          }
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:focus:ring-offset-zinc-900"
        >
          {isProcessing ? "Scheduling..." : scheduledFor ? "Schedule broadcast" : "Launch broadcast"}
        </button>
      </div>
    </form>
  );
}
