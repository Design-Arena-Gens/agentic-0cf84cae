'use client';

import type { PropsWithChildren, ReactNode } from "react";

interface SectionCardProps extends PropsWithChildren {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionCard({ title, description, action, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}
