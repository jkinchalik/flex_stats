"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

import {
  addPlayer,
  editPlayer,
  removePlayer,
  type RosterRow,
} from "@/lib/players/actions";
import { colorForPuuid } from "@/lib/stats/_shared/palette";

function AvatarPreview({ url }: { url: string }) {
  let valid = false;
  try {
    const p = new URL(url);
    valid = p.protocol === "http:" || p.protocol === "https:";
  } catch {
    valid = false;
  }
  if (!valid) return null;
  return (
    <img
      src={url}
      alt="Avatar preview"
      className="mt-1 h-10 w-10 rounded-full object-cover border border-white/10"
    />
  );
}

function InitialCircle({ puuid, label }: { puuid: string; label: string }) {
  const color = colorForPuuid(puuid);
  const initial = label.charAt(0).toUpperCase();
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-zinc-900"
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  );
}

function AddPlayerForm({ onAdded }: { onAdded: () => void }) {
  const [riotId, setRiotId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await addPlayer({
        riotId,
        displayName: displayName || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      if (result.ok) {
        setMessage({ ok: true, text: "Added! Syncing matches..." });
        setRiotId("");
        setDisplayName("");
        setAvatarUrl("");
        onAdded();
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 flex flex-col gap-3"
    >
      <p className="text-sm font-semibold text-zinc-300">Add player</p>
      <div className="flex flex-col gap-2">
        <input
          type="text"
          required
          placeholder="Faker#KR1"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          className="rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <input
          type="text"
          placeholder="Display name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <div>
          <input
            type="text"
            placeholder="https://..."
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
          {avatarUrl && <AvatarPreview url={avatarUrl} />}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Adding…" : "Add Player"}
        </button>
        {message && (
          <p
            className={`text-sm ${message.ok ? "text-emerald-400" : "text-red-400"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}

function EditPlayerRow({
  row,
  onMutated,
}: {
  row: RosterRow;
  onMutated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [displayName, setDisplayName] = useState(row.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(row.avatarUrl ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isRemoving, startRemove] = useTransition();

  const label = row.displayName ?? row.gameName ?? row.riotId;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startSave(async () => {
      const result = await editPlayer({
        puuid: row.puuid,
        displayName: displayName || null,
        avatarUrl: avatarUrl || null,
      });
      if (result.ok) {
        setMessage({ ok: true, text: "Saved!" });
        setExpanded(false);
        onMutated();
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  function handleRemove() {
    const confirmed = window.confirm(
      `Remove ${label} and ALL their stats? This can't be undone.`,
    );
    if (!confirmed) return;
    startRemove(async () => {
      await removePlayer(row.puuid);
      onMutated();
    });
  }

  return (
    <li className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
      <div className="flex items-center gap-3">
        {row.avatarUrl ? (
          <img
            src={row.avatarUrl}
            alt={label}
            className="h-8 w-8 rounded-full object-cover border border-white/10 shrink-0"
          />
        ) : (
          <InitialCircle puuid={row.puuid} label={label} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{row.riotId}</p>
          {row.displayName && (
            <p className="truncate text-xs text-zinc-400">{row.displayName}</p>
          )}
        </div>
        <button
          onClick={() => {
            setExpanded((v) => !v);
            setMessage(null);
          }}
          className="shrink-0 rounded-lg border border-white/10 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          {expanded ? "Cancel" : "Edit"}
        </button>
      </div>

      {expanded && (
        <form
          onSubmit={handleSave}
          className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3"
        >
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
          <div>
            <input
              type="text"
              placeholder="https://..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            {avatarUrl && <AvatarPreview url={avatarUrl} />}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isRemoving}
              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
            >
              {isRemoving ? "Removing…" : "Remove"}
            </button>
            {message && (
              <p
                className={`text-xs ${message.ok ? "text-emerald-400" : "text-red-400"}`}
              >
                {message.text}
              </p>
            )}
          </div>
        </form>
      )}
    </li>
  );
}

export function ManageSquad({ initialRoster }: { initialRoster: RosterRow[] }) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white">Manage Squad</h2>
        <p className="mt-1 text-xs italic text-zinc-500">
          Anyone with the link can edit this. Don&apos;t be a goblin.
        </p>
      </div>

      <AddPlayerForm onAdded={refresh} />

      {initialRoster.length > 0 && (
        <ul className="flex flex-col gap-2">
          {initialRoster.map((row) => (
            <EditPlayerRow key={row.puuid} row={row} onMutated={refresh} />
          ))}
        </ul>
      )}

      {initialRoster.length === 0 && (
        <p className="text-sm text-zinc-500">No players yet. Add one above.</p>
      )}
    </div>
  );
}