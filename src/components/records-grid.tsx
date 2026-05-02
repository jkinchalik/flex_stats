import Link from "next/link";
import type { RecordsAndShame, RecordEntry } from "@/lib/stats/records";

type Props = {
  data: RecordsAndShame;
};

type Category = RecordsAndShame["records"][number];

// ── Individual record card ───────────────────────────────────────────────────

type CardProps = {
  category: Category;
  accent: "amber" | "rose";
};

function RecordCard({ category, accent }: CardProps) {
  const borderClass =
    accent === "amber"
      ? "border-amber-400/30 hover:border-amber-400/60"
      : "border-rose-400/30 hover:border-rose-400/60";

  const pillClass =
    accent === "amber"
      ? "bg-amber-400/15 text-amber-300 ring-amber-400/30"
      : "bg-rose-400/15 text-rose-300 ring-rose-400/30";

  return (
    <div
      className={`flex h-full flex-col gap-3 rounded-xl border bg-zinc-900/60 p-5 transition-colors hover:bg-zinc-900 ${borderClass}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="text-3xl leading-none">{category.emoji}</div>
      </div>

      {/* Name + description */}
      <div>
        <div className="font-semibold text-zinc-100">{category.name}</div>
        <div className="mt-1 text-sm text-zinc-400">{category.description}</div>
      </div>

      {/* Winners */}
      <div className="mt-auto flex flex-col gap-2 pt-2">
        {category.winners.length > 0 ? (
          category.winners.map((winner) => (
            <WinnerRow key={winner.puuid} winner={winner} pillClass={pillClass} />
          ))
        ) : (
          <span className="text-sm italic text-zinc-500">No qualifier yet</span>
        )}
      </div>
    </div>
  );
}

// ── Winner row (with optional link) ─────────────────────────────────────────

type WinnerRowProps = {
  winner: RecordEntry;
  pillClass: string;
};

function WinnerRowInner({ winner, pillClass }: WinnerRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium text-zinc-100">
          {winner.displayName}
        </span>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${pillClass}`}
        >
          {winner.value}
        </span>
      </div>
      {winner.detail && (
        <span className="text-xs text-zinc-500">{winner.detail}</span>
      )}
    </div>
  );
}

function WinnerRow({ winner, pillClass }: WinnerRowProps) {
  return (
    <Link href={`/players/${winner.puuid}`} className="block">
      <WinnerRowInner winner={winner} pillClass={pillClass} />
    </Link>
  );
}

// ── Section heading ──────────────────────────────────────────────────────────

type SectionProps = {
  title: string;
  accent: "amber" | "rose";
  categories: Category[];
};

function Section({ title, accent, categories }: SectionProps) {
  const headingClass =
    accent === "amber" ? "text-amber-300" : "text-rose-300";

  return (
    <div className="flex flex-col gap-4">
      <h2 className={`text-xl font-bold ${headingClass}`}>{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {categories.map((cat) => (
          <RecordCard key={cat.id} category={cat} accent={accent} />
        ))}
      </div>
    </div>
  );
}

// ── Root export ──────────────────────────────────────────────────────────────

export function RecordsGrid({ data }: Props) {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <Section title="🏆 Records" accent="amber" categories={data.records} />
      <Section title="💩 Hall of Shame" accent="rose" categories={data.shame} />
    </div>
  );
}
