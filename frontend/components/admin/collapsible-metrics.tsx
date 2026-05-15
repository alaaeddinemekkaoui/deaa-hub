'use client';

import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type CollapsibleMetricsProps = {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function CollapsibleMetrics({
  summary,
  children,
  defaultOpen = false,
}: CollapsibleMetricsProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <button
        className="flex w-full items-center justify-between gap-3 text-left text-sm text-slate-600"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="min-w-0 truncate">{summary}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
