export type PixelIconName = "coin" | "sun" | "newspaper" | "market" | "bank" | "bag"
  | "star" | "portfolio" | "leaf" | "chip" | "oil" | "moon" | "flag" | "phone";

const shapes: Record<PixelIconName, string> = {
  coin: "M6 2h8v2h2v2h2v8h-2v2h-2v2H6v-2H4v-2H2V6h2V4h2z M9 5h2v2h3v2h-4v2h4v4h-3v2H9v-2H6v-2h4v-2H6V7h3z",
  sun: "M8 0h4v3H8z M8 17h4v3H8z M0 8h3v4H0z M17 8h3v4h-3z M3 2h3v3H3z M14 2h3v3h-3z M3 15h3v3H3z M14 15h3v3h-3z M6 5h8v2h2v6h-2v2H6v-2H4V7h2z",
  newspaper: "M2 3h16v14H2z M4 5h6v5H4z M12 5h4v2h-4z M12 9h4v2h-4z M4 12h12v2H4z",
  market: "M2 2h2v14h14v2H2z M6 10h3v4H6z M10 7h3v7h-3z M14 4h3v10h-3z",
  bank: "M9 1h2v2h3v2h3v2h2v2H1V7h2V5h3V3h3z M3 10h3v6H3z M8 10h4v6H8z M14 10h3v6h-3z M1 17h18v2H1z",
  bag: "M7 2h6v2h-1v2h3v2h2v2h1v6h-2v2H4v-2H2v-6h1V8h2V6h3V4H7z M9 8h2v2h3v2h-4v1h4v3h-3v1H9v-1H6v-2h4v-1H6v-3h3z",
  star: "M8 1h4v5h6v4h-3v3h-2v5h-3v-3H7v3H4v-5H2v-3H0V6h8z",
  portfolio: "M6 2h8v3h4v13H2V5h4z M8 4v2h4V4z M4 9v2h12V9z M9 10v4h2v-4z",
  leaf: "M12 2h6v7h-2v4h-4v2H8v2H6v2H3v-3h2v-2H3V8h2V6h3V4h4z M12 6v2h-2v2H8v2H6v2h2v-2h2v-2h2V8h2V6z",
  chip: "M6 0h2v3h4V0h2v3h3v3h3v2h-3v4h3v2h-3v3h-3v3h-2v-3H8v3H6v-3H3v-3H0v-2h3V8H0V6h3V3h3z M6 6v8h8V6z M8 8h4v4H8z",
  oil: "M5 2h10v2h2v12h-2v2H5v-2H3V4h2z M5 5v2h10V5z M5 13v2h10v-2z M10 7l-3 4v2h6v-2z",
  moon: "M6 2h7v2H9v2H7v7h2v2h5v-2h3v3h-3v2H6v-2H3v-3H1V6h2V4h3z",
  flag: "M3 1h2v18H3z M6 2h11v8H6z M6 13h8v2H6z",
  phone: "M5 1h10v18H5z M7 4v11h6V4z M9 16v1h2v-1z",
};

export default function PixelIcon({ name, className = "" }: { name: PixelIconName; className?: string }) {
  return <svg className={`pixel-icon ${className}`} viewBox="0 0 20 20" fill="currentColor"
    fillRule="evenodd" shapeRendering="crispEdges" aria-hidden="true" focusable="false"><path d={shapes[name]} /></svg>;
}
