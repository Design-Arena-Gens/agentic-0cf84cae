'use client';

import { FormEvent, useState } from "react";
import { nanoid } from "nanoid";
import type { MessageTemplate } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

interface TemplateManagerProps {
  templates: MessageTemplate[];
  onAddTemplate: (template: MessageTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onSelectTemplate: (id: string) => void;
  activeTemplateId: string | null;
}

const PLACEHOLDER_SUGGESTIONS = ["{{firstName}}", "{{company}}", "{{meetingTime}}", "{{eventLocation}}"];

export function TemplateManager({
  templates,
  onAddTemplate,
  onDeleteTemplate,
  onSelectTemplate,
  activeTemplateId,
}: TemplateManagerProps) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !body.trim()) {
      setError("Template name and message body are required.");
      return;
    }
    if (body.trim().length > 1100) {
      setError("Template body is too long. Keep it under 1100 characters.");
      return;
    }

    const template: MessageTemplate = {
      id: nanoid(),
      name: name.trim(),
      body: body.trim(),
      createdAt: new Date().toISOString(),
    };

    onAddTemplate(template);
    setName("");
    setBody("");
    setError(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900/60 dark:bg-sky-900/10">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
            Draft a message template
          </h3>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tight text-sky-700 dark:text-sky-300">
            <span>Use placeholders</span>
            <div className="flex gap-1">
              {PLACEHOLDER_SUGGESTIONS.map((placeholder) => (
                <code
                  key={placeholder}
                  className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-800"
                >
                  {placeholder}
                </code>
              ))}
            </div>
          </div>
        </div>
        <label className="text-xs font-medium uppercase tracking-wide text-sky-700 dark:text-sky-200">
          Template name
          <input
            className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Launch reminder"
            required
          />
        </label>
        <label className="text-xs font-medium uppercase tracking-wide text-sky-700 dark:text-sky-200">
          WhatsApp message
          <textarea
            className="mt-1 min-h-[140px] w-full rounded-lg border border-sky-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Hey {{firstName}}, we opened a few more slots tomorrow at {{meetingTime}}. Want me to hold one for you?"
            required
          />
        </label>
        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          >
            Save template
          </button>
          <p className="text-[11px] uppercase tracking-wide text-sky-600/80 dark:text-sky-300/70">
            Templates help you stay compliant. Personalise using {"{{placeholders}}"}.
          </p>
        </div>
      </form>

      {templates.length ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-zinc-500">
            <span>Saved templates</span>
            <span>{templates.length} total</span>
          </div>
          <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
            {templates.map((template) => {
              const isActive = template.id === activeTemplateId;
              return (
                <li
                  key={template.id}
                  className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/60 ${
                    isActive
                      ? "border-sky-300 bg-white shadow-sky-100/60 dark:border-sky-700 dark:bg-sky-950/40"
                      : "border-zinc-200 bg-white/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onSelectTemplate(template.id)}
                      className="text-left"
                    >
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {template.name}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
                        {template.body}
                      </p>
                    </button>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[11px] uppercase tracking-wide text-zinc-400">
                        {formatRelativeTime(template.createdAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteTemplate(template.id)}
                        className="text-xs font-medium text-rose-500 transition hover:text-rose-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="font-medium text-zinc-700 dark:text-zinc-200">No templates saved yet.</p>
          <p className="mt-2 text-xs">
            Save a few frequently-used messages so your team can launch personalised WhatsApp broadcasts in seconds.
          </p>
        </div>
      )}
    </div>
  );
}
