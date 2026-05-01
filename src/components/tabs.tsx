"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tab = {
  id: string;
  label: string;
  content: ReactNode;
};

export function Tabs({ tabs, defaultId }: { tabs: Tab[]; defaultId?: string }) {
  const initial = defaultId ?? tabs[0]?.id ?? "";
  const [active, setActive] = useState(initial);

  return (
    <div>
      <div
        role="tablist"
        className="mb-6 flex flex-wrap gap-1 border-b border-white/10"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActive(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-semibold transition-colors -mb-px border-b-2",
                isActive
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          hidden={tab.id !== active}
          className={tab.id === active ? "" : "hidden"}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
