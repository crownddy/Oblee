export const CATEGORIES = [
  { value: "party", label: "Party", color: "#6a47f5", icon: "star" },
  { value: "music", label: "Music", color: "#8b5cf6", icon: "music" },
  { value: "concert", label: "Concert", color: "#8b5cf6", icon: "mic" },
  { value: "festival", label: "Festival", color: "#ec4899", icon: "tent" },
  { value: "food", label: "Food", color: "#f97316", icon: "glass" },
  { value: "network", label: "Network", color: "#0ea5a4", icon: "ppl" },
  { value: "fashion_show", label: "Fashion show", color: "#d946ef", icon: "hang" },
  { value: "webinar", label: "Webinar", color: "#3b82f6", icon: "screen" },
  { value: "carnival", label: "Carnival", color: "#f59e0b", icon: "spark" },
  { value: "owambe", label: "Owambe", color: "#ef4444", icon: "drum" },
  { value: "trade_show", label: "Trade show", color: "#0891b2", icon: "shop" },
] as const;

export type EventCategory = (typeof CATEGORIES)[number]["value"];

export const CATEGORY_LABELS: Record<EventCategory, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
) as Record<EventCategory, string>;

export const CATEGORY_COLORS: Record<EventCategory, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.color]),
) as Record<EventCategory, string>;

export function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value as EventCategory] ?? value;
}

export function categoryColor(value: string): string {
  return CATEGORY_COLORS[value as EventCategory] ?? "#6a47f5";
}

export function isEventCategory(value: string): value is EventCategory {
  return CATEGORIES.some((c) => c.value === value);
}

/** Order of the discover type tabs, preserved from the prototype. */
export const TYPE_TABS: EventCategory[] = [
  "concert",
  "fashion_show",
  "webinar",
  "carnival",
  "owambe",
  "festival",
  "trade_show",
];

export const QUICK_FILTERS = [
  { value: "", label: "All", icon: "grid", color: "#6a47f5" },
  { value: "Today", label: "Today", icon: "heart", color: "#ff4d8d" },
  { value: "Weekend", label: "Weekend", icon: "cal", color: "#ff8a3d" },
  { value: "music", label: "Music", icon: "music", color: "#12b5a6" },
  { value: "festival", label: "Festival", icon: "star", color: "#8b5cf6" },
  { value: "food", label: "Food", icon: "glass", color: "#ff5a7a" },
  { value: "network", label: "Network", icon: "ppl", color: "#3b82f6" },
] as const;

export const COVER_PALETTES: ReadonlyArray<readonly [string, string]> = [
  ["#6a47f5", "#ff4fa3"],
  ["#ff8a3d", "#7a3df0"],
  ["#16b6ff", "#8a3dff"],
  ["#ff4fa3", "#ffb347"],
  ["#2ad4a0", "#5b3df0"],
];

export const SECURITY_OPTIONS = [
  "On-site security",
  "Bag checks at entry",
  "Licensed guards and medic",
  "No formal security",
] as const;

export const IDENTITY_OPTIONS = [
  "ID required",
  "18+ ID check (NIN, Driver's License)",
  "No ID needed",
] as const;

export const TICKET_MODES = ["Regular", "VIP", "VVIP"] as const;
export type TicketMode = (typeof TICKET_MODES)[number];

export const TABLE_SEATS = ["None", "2", "4", "6", "8", "10", "12"] as const;
export const TABLE_COUNTS = ["None", "1", "2", "3", "4", "5", "6", "8", "10", "15", "20"] as const;

export const CONTACT_KINDS = ["whatsapp", "call", "email"] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

export const CONTACT_KIND_LABELS: Record<ContactKind, string> = {
  whatsapp: "WhatsApp",
  call: "Call",
  email: "Email",
};

export const CONTACT_ICONS: Record<ContactKind, "chat" | "phone" | "mail"> = {
  whatsapp: "chat",
  call: "phone",
  email: "mail",
};

export const CONTACT_COLORS: Record<ContactKind, string> = {
  whatsapp: "#22c55e",
  call: "#6a47f5",
  email: "#6a47f5",
};

export const CONTACT_CAPTIONS: Record<ContactKind, string[]> = {
  whatsapp: ["Chat on WhatsApp", "Message us on WhatsApp", "Reserve on WhatsApp"],
  call: ["Call to reserve", "Call the host", "Call us"],
  email: ["Send an email", "Email to reserve", "Email the host"],
};

export const COUNTRY_CODES: ReadonlyArray<readonly [string, string]> = [
  ["NG", "+234"],
  ["GH", "+233"],
  ["KE", "+254"],
  ["ZA", "+27"],
  ["GB", "+44"],
  ["US", "+1"],
  ["AE", "+971"],
  ["CM", "+237"],
  ["SN", "+221"],
  ["CI", "+225"],
];

export const EVENT_STATUSES = ["published", "archived", "removed"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const USER_ROLES = ["attendee", "organiser", "admin"] as const;

export const REPORT_REASONS = [
  "Misleading or fake event",
  "Unsafe or illegal activity",
  "Scam or fraud",
  "Offensive content",
  "Other",
] as const;

export const THEMES = [
  { value: "", label: "Classic", description: "Clean white, the default look", swatch: "linear-gradient(135deg,#6a47f5,#ff4fa3)" },
  { value: "dark", label: "Dark mode", description: "Easy on the eyes at night", swatch: "linear-gradient(135deg,#17142b,#6a47f5)" },
  { value: "glass", label: "Glassmorphism", description: "Frosted glass over soft colour", swatch: "linear-gradient(135deg,#c9bbff,#ffc2e4,#b9e7ff)" },
  { value: "min", label: "Minimalist", description: "Black and white, nothing extra", swatch: "linear-gradient(135deg,#111,#e6e6e6)" },
  { value: "vibe", label: "Vibrant 3D", description: "Bold colour and chunky 3D buttons", swatch: "linear-gradient(135deg,#ffd23f,#ff2e93)" },
  { value: "xmas", label: "Christmas", description: "Snow, Santa hats and a festive jet", swatch: "linear-gradient(135deg,#e63946,#0f2a24)" },
] as const;

export type ThemeValue = (typeof THEMES)[number]["value"];

export const PAGE_SIZE = 10;
export const FEATURED_LIMIT = 6;
export const MAX_TAGS = 8;
export const MAX_DESCRIPTION = 500;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const EVENT_IMAGE_BUCKET = "event-images";
// Covers live in a private bucket; viewers get short-lived signed URLs.
export const SIGNED_IMAGE_URL_TTL = 60 * 60;
export const DEFAULT_TIMEZONE = "Africa/Lagos";
