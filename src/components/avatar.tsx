import { colorForPuuid } from "@/lib/stats/_shared/palette";
import { cn } from "@/lib/utils";

type Props = {
  puuid: string;
  displayName: string;
  avatarUrl: string | null | undefined;
  size?: number;
  className?: string;
};

export function Avatar({ puuid, displayName, avatarUrl, size = 28, className }: Props) {
  const style = { width: size, height: size };
  const base = cn("shrink-0 rounded-full", className);

  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        loading="lazy"
        referrerPolicy="no-referrer"
        style={style}
        className={cn(base, "object-cover ring-1 ring-white/10")}
      />
    );
  }

  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  const bg = colorForPuuid(puuid);

  return (
    <span
      className={cn(base, "inline-flex items-center justify-center text-xs font-bold text-zinc-900")}
      style={{ ...style, backgroundColor: bg }}
      aria-hidden
    >
      {initial}
    </span>
  );
}