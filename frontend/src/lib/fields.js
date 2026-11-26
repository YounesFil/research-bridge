// A curated categorical palette for research fields (no purple).
// Field names hash to a stable color so the same field looks the same everywhere.
const COLORS = [
  "#2dd4bf", // teal
  "#38bdf8", // sky
  "#f5a524", // amber
  "#a3e635", // lime
  "#fb7185", // rose
  "#60a5fa", // blue
  "#34d399", // emerald
  "#fb923c", // orange
  "#f472b6", // pink
  "#22d3ee", // cyan
  "#facc15", // yellow
  "#4ade80", // green
];

export function fieldColor(name) {
  if (!name) return "#64748b";
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

export function formatNumber(n) {
  if (n === null || n === undefined) return "-";
  return new Intl.NumberFormat("en-US").format(n);
}
