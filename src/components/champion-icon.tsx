import { cn } from "@/lib/utils";

const DDRAGON_VERSION = "15.21.1";

type Props = {
  name: string | null | undefined;
  size?: number;
  className?: string;
};

export function ChampionIcon({ name, size = 24, className }: Props) {
  if (!name) {
    return (
      <span
        className={cn(
          "inline-block shrink-0 rounded bg-zinc-800",
          className,
        )}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }
  const url = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${name}.png`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      className={cn(
        "inline-block shrink-0 rounded bg-zinc-800 ring-1 ring-white/10",
        className,
      )}
    />
  );
}
