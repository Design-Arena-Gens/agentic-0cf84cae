'use client';

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { nanoid } from "nanoid";
import type { Contact } from "@/lib/types";

interface ContactManagerProps {
  contacts: Contact[];
  onAdd: (contact: Contact) => void;
  onRemove: (id: string) => void;
  onBulkAdd: (contacts: Contact[]) => void;
  onToggleOptIn: (id: string, optIn: boolean) => void;
}

const phonePattern = /^\+?[0-9()[\]\s-]{6,}$/;

export function ContactManager({
  contacts,
  onAdd,
  onRemove,
  onBulkAdd,
  onToggleOptIn,
}: ContactManagerProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalOptedIn = useMemo(
    () => contacts.filter((contact) => contact.optIn).length,
    [contacts],
  );

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    contacts.forEach((contact) => {
      contact.tags.forEach((tag) => {
        const normalized = tag.toLowerCase();
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [contacts]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setTags("");
    setNotes("");
    setErrors(null);
  };

  const handleAddContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setErrors("Contact name is required.");
      return;
    }
    if (!phonePattern.test(phone.trim())) {
      setErrors("Phone number must be in international format, e.g. +15551231234.");
      return;
    }

    const contact: Contact = {
      id: nanoid(),
      name: name.trim(),
      phone: phone.trim(),
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      optIn: true,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onAdd(contact);
    resetForm();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const imported = results.data
          .map((row) => {
            const rowName = row.name ?? row.fullName ?? row.fullname ?? "";
            const rowPhone = row.phone ?? row.whatsapp ?? row.mobile ?? "";
            if (!rowName || !phonePattern.test(rowPhone.trim())) {
              return null;
            }
            const tagValue = row.tags ?? row.segment ?? "";
            const note = row.notes?.trim();
            const contact: Contact = {
              id: nanoid(),
              name: rowName.trim(),
              phone: rowPhone.trim(),
              tags: tagValue
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
              optIn: (row.optIn ?? row.subscribed ?? "true").toLowerCase() !== "false",
              createdAt: new Date().toISOString(),
            };
            if (note) {
              contact.notes = note;
            }
            return {
              ...contact,
            } as Contact;
          })
          .filter(
            (contact): contact is Contact => contact !== null,
          );

        onBulkAdd(imported);
        event.target.value = "";
      },
      error: (error) => {
        console.error("Failed to import contacts:", error.message);
        setErrors("Could not import contacts. Please check the CSV format.");
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 text-sm text-zinc-600 dark:text-zinc-300">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-semibold text-zinc-900 dark:text-white">{contacts.length}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Total contacts</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-semibold text-emerald-600">{totalOptedIn}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Opted-in recipients</p>
        </div>
      </div>

      <form onSubmit={handleAddContact} className="flex flex-col gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-900/10">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Quick add contact
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
            Name
            <input
              className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Taylor Reed"
              required
            />
          </label>
          <label className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
            WhatsApp number
            <input
              className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+1 415 555 0138"
              required
            />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
            Tags (comma separated)
            <input
              className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="vip, beta-list"
            />
          </label>
          <label className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
            Notes
            <input
              className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Context to personalise outreach"
            />
          </label>
        </div>
        {errors ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200">
            {errors}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          >
            + Add contact
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:border-emerald-500 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:border-emerald-800 dark:text-emerald-200 dark:hover:border-emerald-500 dark:hover:text-emerald-100 dark:focus:ring-offset-zinc-900"
          >
            Import CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70">
          CSV columns supported: name, phone, tags, notes, optIn. Phone numbers should include the country code.
        </p>
      </form>

      {contacts.length ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-zinc-500">
            <span>Contacts</span>
            <span>{contacts.length} total</span>
          </div>
          <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
            {contacts.map((contact) => (
              <li
                key={contact.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white/70 p-4 text-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/70"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{contact.name}</p>
                  <p className="text-xs text-zinc-500">{contact.phone}</p>
                  {contact.notes ? (
                    <p className="mt-2 text-xs text-zinc-500">{contact.notes}</p>
                  ) : null}
                  {contact.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {contact.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <label className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
                    <input
                      type="checkbox"
                      checked={contact.optIn}
                      onChange={(event) => onToggleOptIn(contact.id, event.target.checked)}
                      className="h-4 w-4 rounded border border-emerald-200 text-emerald-600 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-emerald-950"
                    />
                    Opted in
                  </label>
                  <button
                    type="button"
                    onClick={() => onRemove(contact.id)}
                    className="text-xs font-medium text-rose-500 transition hover:text-rose-600"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
          <p className="font-medium text-zinc-700 dark:text-zinc-200">No contacts yet.</p>
          <p className="mt-2 text-xs">
            Add contacts manually or import a CSV export from your CRM to start building your WhatsApp broadcast list.
          </p>
        </div>
      )}

      {tagCounts.length ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-100/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
            Top tags
          </h4>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
            {tagCounts.map(([tag, count]) => (
              <span key={tag} className="rounded-full bg-white px-2 py-1 dark:bg-zinc-900/80">
                #{tag} · {count}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
