'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { ContactManager } from "@/components/ContactManager";
import { TemplateManager } from "@/components/TemplateManager";
import { BroadcastComposer } from "@/components/BroadcastComposer";
import { DeliveryTimeline } from "@/components/DeliveryTimeline";
import { SectionCard } from "@/components/SectionCard";
import { usePersistentState } from "@/hooks/usePersistentState";
import { seedContacts, seedTemplates } from "@/lib/sampleData";
import type {
  Broadcast,
  Contact,
  DeliveryLogEntry,
  MessageTemplate,
} from "@/lib/types";

export default function Home() {
  const [contacts, setContacts] = usePersistentState<Contact[]>(
    "wm.contacts",
    () => seedContacts(),
  );
  const [templates, setTemplates] = usePersistentState<MessageTemplate[]>(
    "wm.templates",
    () => seedTemplates(),
  );
  const [broadcasts, setBroadcasts] = usePersistentState<Broadcast[]>(
    "wm.broadcasts",
    () => [],
  );
  const [deliveries, setDeliveries] = usePersistentState<DeliveryLogEntry[]>(
    "wm.deliveries",
    () => [],
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    () => templates[0]?.id ?? null,
  );
  const [message, setMessage] = useState(
    () => templates[0]?.body ?? "",
  );
  const [broadcastLabel, setBroadcastLabel] = useState(
    () =>
      templates[0]
        ? `${templates[0].name} broadcast`
        : "WhatsApp broadcast",
  );
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [audienceTag, setAudienceTag] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const processingRef = useRef(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);

  const templateLookup = useMemo(
    () =>
      new Map<string, MessageTemplate>(
        templates.map((template) => [template.id, template]),
      ),
    [templates],
  );

  const handleAddContact = (contact: Contact) => {
    setContacts((prev) => [contact, ...prev]);
  };

  const handleRemoveContact = (id: string) => {
    setContacts((prev) => prev.filter((contact) => contact.id !== id));
  };

  const handleBulkAdd = (imported: Contact[]) => {
    if (!imported.length) return;
    setContacts((prev) => {
      const seen = new Set(prev.map((contact) => contact.phone.replace(/\D/g, "")));
      const unique = imported.filter((contact) => {
        const normalized = contact.phone.replace(/\D/g, "");
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
      if (!unique.length) return prev;
      return [...unique, ...prev];
    });
  };

  const handleToggleOptIn = (id: string, optIn: boolean) => {
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === id ? { ...contact, optIn } : contact,
      ),
    );
  };

  const handleAddTemplate = (template: MessageTemplate) => {
    setTemplates((prev) => {
      const exists = prev.some(
        (item) =>
          item.name.toLowerCase() === template.name.toLowerCase() &&
          item.body.trim() === template.body.trim(),
      );
      if (exists) return prev;
      return [template, ...prev];
    });
    setSelectedTemplateId(template.id);
    setMessage(template.body);
    setBroadcastLabel(`${template.name} broadcast`);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((template) => template.id !== id));
    if (selectedTemplateId === id) {
      setSelectedTemplateId(null);
      setMessage("");
    }
  };

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const template = templateLookup.get(id);
    if (template) {
      setMessage(template.body);
      setBroadcastLabel(`${template.name} broadcast`);
    }
  };

  const handleLaunchBroadcast = (
    broadcast: Broadcast,
    deliveryEntries: DeliveryLogEntry[],
  ) => {
    setBroadcasts((prev) => [broadcast, ...prev]);
    setDeliveries((prev) => [...prev, ...deliveryEntries]);
    setMessage("");
    setBroadcastLabel("Follow-up broadcast");
    setScheduledFor(null);
  };

  useEffect(() => {
    setBroadcasts((prev) =>
      prev.map((broadcast) => {
        const relatedEntries = deliveries.filter(
          (entry) => entry.broadcastId === broadcast.id,
        );
        if (!relatedEntries.length) {
          return broadcast;
        }
        const delivered = relatedEntries.filter(
          (entry) => entry.status === "delivered",
        ).length;
        const failed = relatedEntries.filter(
          (entry) => entry.status === "failed",
        ).length;
        const inFlight = relatedEntries.some(
          (entry) => entry.status === "pending" || entry.status === "sending",
        );
        let status: Broadcast["status"] = broadcast.status;
        if (failed === relatedEntries.length && !delivered) {
          status = "failed";
        } else if (inFlight) {
          status = "in_progress";
        } else if (delivered + failed >= relatedEntries.length) {
          status = "completed";
        } else if (broadcast.scheduledFor) {
          status = "scheduled";
        }

        if (
          status === broadcast.status &&
          delivered === broadcast.delivered &&
          failed === broadcast.failed
        ) {
          return broadcast;
        }

        return { ...broadcast, delivered, failed, status };
      }),
    );
  }, [deliveries, setBroadcasts]);

  useEffect(() => {
    if (processingRef.current) return;
    const now = Date.now();
    const next = deliveries.find(
      (entry) =>
        entry.status === "pending" &&
        (!entry.scheduledFor ||
          new Date(entry.scheduledFor).getTime() <= now + 500),
    );
    if (!next) return;

    processingRef.current = true;
    const startIso = new Date().toISOString();
    setDeliveries((prev) =>
      prev.map((entry) =>
        entry.id === next.id
          ? { ...entry, status: "sending", startedAt: startIso }
          : entry,
      ),
    );

    const shouldFail = Math.random() < 0.08;
    const timeout = window.setTimeout(() => {
      const completedAt = new Date().toISOString();
      setDeliveries((prev) =>
        prev.map((entry) =>
          entry.id === next.id
            ? {
                ...entry,
                status: shouldFail ? "failed" : "delivered",
                completedAt,
                error: shouldFail
                  ? "WhatsApp API returned a temporary error. Retry later."
                  : undefined,
              }
            : entry,
        ),
      );
      processingRef.current = false;
    }, 900 + Math.random() * 1600);

    return () => {
      window.clearTimeout(timeout);
      processingRef.current = false;
    };
  }, [deliveries, setDeliveries, processingRef]);

  const scheduledDeliveries = useMemo(
    () =>
      deliveries.filter(
        (entry) =>
          entry.status === "pending" &&
          entry.scheduledFor &&
          new Date(entry.scheduledFor).getTime() > now,
      ),
    [deliveries, now],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-white to-sky-100 pb-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 pt-16 md:px-10 lg:px-16">
        <header className="flex flex-col gap-6 rounded-3xl border border-emerald-200/80 bg-white/80 p-10 shadow-[0_35px_90px_rgba(15,23,42,0.12)] backdrop-blur dark:border-emerald-900/40 dark:bg-zinc-950/70">
          <div className="inline-flex max-w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-900/40 dark:text-emerald-200">
            WhatsApp Ops cockpit
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold leading-tight text-zinc-900 dark:text-white md:text-5xl">
                Launch WhatsApp broadcasts that feel personal at scale.
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-300">
                Import opted-in contacts, craft compliance-friendly templates, and trigger orchestrated broadcasts with real-time delivery telemetry.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Scheduled deliveries</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {scheduledDeliveries.length}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Next send:{" "}
                {scheduledDeliveries.length
                  ? new Date(
                      scheduledDeliveries
                        .map((entry) => new Date(entry.scheduledFor ?? "").getTime())
                        .sort((a, b) => a - b)[0],
                    ).toLocaleString()
                  : "No upcoming drops"}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-8 xl:grid-cols-[360px_1fr]">
          <SectionCard
            title="Audience workspace"
            description="Centralise WhatsApp-ready contacts, tags, and consent in one place."
          >
            <ContactManager
              contacts={contacts}
              onAdd={handleAddContact}
              onRemove={handleRemoveContact}
              onBulkAdd={handleBulkAdd}
              onToggleOptIn={handleToggleOptIn}
            />
          </SectionCard>

          <div className="flex flex-col gap-8">
            <SectionCard
              title="Template studio"
              description="Write once, personalise automatically with dynamic placeholders."
            >
              <TemplateManager
                templates={templates}
                onAddTemplate={handleAddTemplate}
                onDeleteTemplate={handleDeleteTemplate}
                onSelectTemplate={handleSelectTemplate}
                activeTemplateId={selectedTemplateId}
              />
            </SectionCard>

            <SectionCard
              title="Broadcast launcher"
              description="Pick the audience, personalise copy, enforce compliance, then launch."
            >
              <BroadcastComposer
                contacts={contacts}
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                message={message}
                onMessageChange={setMessage}
                broadcastLabel={broadcastLabel}
                onBroadcastLabelChange={setBroadcastLabel}
                scheduledFor={scheduledFor}
                onScheduleChange={setScheduledFor}
                audienceTag={audienceTag}
                onAudienceTagChange={setAudienceTag}
                onLaunchBroadcast={handleLaunchBroadcast}
                existingBroadcasts={broadcasts}
                isProcessing={deliveries.some((entry) => entry.status === "sending")}
              />
            </SectionCard>

            <SectionCard
              title="Live delivery feed"
              description="Track performance and troubleshoot failed drops immediately."
            >
              <DeliveryTimeline broadcasts={broadcasts} deliveries={deliveries} />
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
