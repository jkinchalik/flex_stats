"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { players } from "@/lib/db/schema";
import { getAccountByRiotId } from "@/lib/riot/account";
import { RiotNotFoundError } from "@/lib/riot/client";
import { getSummonerByPuuid } from "@/lib/riot/summoner";
import { syncSinglePlayer } from "@/lib/sync/sync";

export type RosterRow = {
  puuid: string;
  riotId: string;
  gameName: string | null;
  tagLine: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  lastSyncedAt: Date | null;
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function listRoster(): Promise<RosterRow[]> {
  return db
    .select({
      puuid: players.puuid,
      riotId: players.riotId,
      gameName: players.gameName,
      tagLine: players.tagLine,
      displayName: players.displayName,
      avatarUrl: players.avatarUrl,
      lastSyncedAt: players.lastSyncedAt,
    })
    .from(players)
    .orderBy(players.riotId);
}

function parseRiotId(riotId: string): { gameName: string; tagLine: string } | null {
  const idx = riotId.lastIndexOf("#");
  if (idx === -1 || idx === 0 || idx === riotId.length - 1) return null;
  return { gameName: riotId.slice(0, idx), tagLine: riotId.slice(idx + 1) };
}

function validateHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function addPlayer(form: {
  riotId: string;
  displayName?: string;
  avatarUrl?: string;
}): Promise<ActionResult> {
  const parsed = parseRiotId(form.riotId.trim());
  if (!parsed) {
    return { ok: false, error: "Invalid Riot ID format" };
  }

  if (form.avatarUrl && form.avatarUrl.trim() !== "") {
    if (!validateHttpUrl(form.avatarUrl.trim())) {
      return { ok: false, error: "Avatar URL must be a valid http(s) link" };
    }
  }

  const { gameName, tagLine } = parsed;

  let puuid: string;
  try {
    const account = await getAccountByRiotId(gameName, tagLine);
    puuid = account.puuid;
  } catch (err) {
    if (err instanceof RiotNotFoundError) {
      return { ok: false, error: "Riot ID not found" };
    }
    return { ok: false, error: "Riot API error" };
  }

  let summonerId: string | undefined;
  try {
    const summoner = await getSummonerByPuuid(puuid);
    summonerId = summoner.id;
  } catch (err) {
    console.error("getSummonerByPuuid failed (non-fatal):", err);
  }

  const inserted = await db
    .insert(players)
    .values({
      puuid,
      riotId: form.riotId.trim(),
      gameName,
      tagLine,
      summonerId,
      displayName: form.displayName?.trim() || null,
      avatarUrl: form.avatarUrl?.trim() || null,
    })
    .onConflictDoNothing({ target: players.puuid })
    .returning({ puuid: players.puuid });

  if (inserted.length === 0) {
    return { ok: false, error: "Player already in roster" };
  }

  syncSinglePlayer(puuid).catch((err) => {
    console.error("syncSinglePlayer failed (non-fatal):", err);
  });

  revalidatePath("/");
  return { ok: true };
}

export async function editPlayer(form: {
  puuid: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<ActionResult> {
  const displayName =
    form.displayName === "" || form.displayName == null ? null : form.displayName.trim();

  const rawAvatarUrl =
    form.avatarUrl === "" || form.avatarUrl == null ? null : form.avatarUrl.trim();

  if (rawAvatarUrl !== null && !validateHttpUrl(rawAvatarUrl)) {
    return { ok: false, error: "Avatar URL must be a valid http(s) link" };
  }

  const updated = await db
    .update(players)
    .set({ displayName, avatarUrl: rawAvatarUrl })
    .where(eq(players.puuid, form.puuid))
    .returning({ puuid: players.puuid });

  if (updated.length === 0) {
    return { ok: false, error: "Player not found" };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function removePlayer(puuid: string): Promise<ActionResult> {
  await db.delete(players).where(eq(players.puuid, puuid));
  revalidatePath("/");
  return { ok: true };
}