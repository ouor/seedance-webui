// Minimal stroke icons ported from the prototype.
export const ICONS: Record<string, string[] | string> = {
  text: "M4 6h16M4 12h16M4 18h10",
  image: ["M3 5h18v14H3z", "M3 16l5-5 4 4 3-3 6 6"],
  frames: ["M3 5h7v14H3z", "M14 5h7v14h-7z"],
  layers: ["M12 3l9 5-9 5-9-5 9-5z", "M3 13l9 5 9-5"],
  video: ["M3 6h13v12H3z", "M16 10l5-3v10l-5-3"],
  audio: ["M4 9v6h4l5 4V5L8 9H4z", "M17 8a5 5 0 010 8"],
  plus: "M12 5v14M5 12h14",
  play: "M8 5l11 7-11 7z",
  download: ["M12 4v11", "M7 11l5 4 5-4", "M5 20h14"],
  refresh: ["M4 12a8 8 0 0114-5l2 2", "M20 5v4h-4", "M20 12a8 8 0 01-14 5l-2-2", "M4 19v-4h4"],
  trash: ["M4 7h16", "M9 7V5h6v2", "M6 7l1 13h10l1-13"],
  chevron: "M6 9l6 6 6-6",
  search: ["M11 4a7 7 0 100 14 7 7 0 000-14z", "M21 21l-4-4"],
  warn: ["M12 3l10 18H2L12 3z", "M12 9v5", "M12 18h.01"],
  info: ["M12 3a9 9 0 100 18 9 9 0 000-18z", "M12 11v6", "M12 7h.01"],
  spark: ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"],
  key: ["M14 7a4 4 0 11-3.4 6.1L4 20H3v-2l6.9-6.6A4 4 0 0114 7z", "M16 9h.01"],
  check: "M5 12l4 4 10-11",
  clock: ["M12 3a9 9 0 100 18 9 9 0 000-18z", "M12 7v5l3 2"],
};

export function Icon({
  name,
  size = 16,
  sw = 1.6,
  color,
  style,
}: {
  name: keyof typeof ICONS | string;
  size?: number;
  sw?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  const d = ICONS[name] ?? "";
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || "currentColor"}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {paths.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}
