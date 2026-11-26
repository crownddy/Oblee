"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useUI } from "@/components/ui/UIProvider";
import {
  CATEGORIES,
  CONTACT_CAPTIONS,
  CONTACT_COLORS,
  CONTACT_ICONS,
  CONTACT_KINDS,
  COVER_PALETTES,
  COUNTRY_CODES,
  DEFAULT_TIMEZONE,
  EVENT_IMAGE_BUCKET,
  IDENTITY_OPTIONS,
  MAX_DESCRIPTION,
  MAX_IMAGE_BYTES,
  MAX_TAGS,
  SECURITY_OPTIONS,
  SIGNED_IMAGE_URL_TTL,
  TABLE_COUNTS,
  TABLE_SEATS,
  TICKET_MODES,
  categoryColor,
  categoryLabel,
  type ContactKind,
  type EventCategory,
  type TicketMode,
} from "@/lib/constants";
import { createEventAction, updateEventAction } from "@/lib/actions/events";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { goBackToOrigin } from "@/lib/navigation/history";
import { CONFIG_REQUIRED_MESSAGE, isSupabaseConfigured } from "@/lib/supabase/config";
import type { EventContact } from "@/lib/types/domain";
import type { EventInput } from "@/lib/validation/event";
import { coverStyle } from "@/lib/utils/events";
import { eventImagePath } from "@/lib/utils/images";
import { cn } from "@/lib/utils/cn";
import { formatEventDate, formatTime, toInstant, todayKey } from "@/lib/utils/format";

export interface WizardInitial {
  title: string;
  category: EventCategory;
  visibility: "public" | "private";
  date: string;
  time: string;
  venue: string;
  city: string;
  description: string;
  securityNote: string;
  identityNote: string;
  tags: string[];
  colorFrom: string;
  colorTo: string;
  /** Stored cover: a path in the private bucket, or an external https link. */
  heroImageUrl: string | null;
  /** Signed URL the form previews; only needed when heroImageUrl is a bucket path. */
  heroImagePreview?: string | null;
  tickets: Array<{ name: string; price: number }>;
  tables: Array<{ seats: number; quantity: number }>;
  contacts: EventContact[];
}

interface Draft {
  title: string;
  category: EventCategory;
  visibility: "public" | "private";
  date: string;
  time: string;
  venue: string;
  city: string;
  description: string;
  securityNote: string;
  identityNote: string;
  tags: string[];
  tagDraft: string;
  heroImageUrl: string | null;
  colorFrom: string;
  colorTo: string;
  paid: boolean;
  tiers: Record<TicketMode, { on: boolean; price: string }>;
  tables: Array<{ seats: string; quantity: string }>;
  contacts: Array<{ kind: ContactKind; caption: string; countryCode: string; value: string }>;
  agreeTerms: boolean;
}

type Step = 1 | 2 | 3 | 4 | "pv" | "tc" | "ok";

const STEP_LABELS = ["Basic Info", "Media", "Details", "Review"] as const;

function toDraft(initial?: WizardInitial): Draft {
  if (!initial) {
    return {
      title: "",
      category: "party",
      visibility: "public",
      date: "",
      time: "18:00",
      venue: "",
      city: "",
      description: "",
      securityNote: SECURITY_OPTIONS[0],
      identityNote: IDENTITY_OPTIONS[0],
      tags: [],
      tagDraft: "",
      heroImageUrl: null,
      colorFrom: COVER_PALETTES[0]![0],
      colorTo: COVER_PALETTES[0]![1],
      paid: false,
      tiers: {
        Regular: { on: false, price: "" },
        VIP: { on: false, price: "" },
        VVIP: { on: false, price: "" },
      },
      tables: [{ seats: "4", quantity: "1" }],
      contacts: [{ kind: "whatsapp", caption: CONTACT_CAPTIONS.whatsapp[0]!, countryCode: "+234", value: "" }],
      agreeTerms: false,
    };
  }

  const tiers: Draft["tiers"] = {
    Regular: { on: false, price: "" },
    VIP: { on: false, price: "" },
    VVIP: { on: false, price: "" },
  };
  for (const ticket of initial.tickets) {
    if (ticket.name in tiers) {
      const mode = ticket.name as TicketMode;
      tiers[mode] = { on: true, price: String(ticket.price) };
    }
  }

  return {
    title: initial.title,
    category: initial.category,
    visibility: initial.visibility,
    date: initial.date,
    time: initial.time,
    venue: initial.venue,
    city: initial.city,
    description: initial.description,
    securityNote: initial.securityNote,
    identityNote: initial.identityNote,
    tags: [...initial.tags],
    tagDraft: "",
    heroImageUrl: initial.heroImageUrl,
    colorFrom: initial.colorFrom,
    colorTo: initial.colorTo,
    paid: initial.tickets.length > 0,
    tiers,
    tables: initial.tables.length
      ? initial.tables.map((table) => ({ seats: String(table.seats), quantity: String(table.quantity) }))
      : [{ seats: "4", quantity: "1" }],
    contacts: initial.contacts.length
      ? initial.contacts.map((contact) => ({ ...contact }))
      : [{ kind: "whatsapp", caption: CONTACT_CAPTIONS.whatsapp[0]!, countryCode: "+234", value: "" }],
    agreeTerms: true,
  };
}

function contactIsValid(contact: Draft["contacts"][number]): boolean {
  if (contact.kind === "email") return /^\S+@\S+\.\S+$/.test(contact.value.trim());
  const digits = contact.value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="ch">
      <button type="button" onClick={onBack} aria-label="Back">
        <Icon name="back" size={22} />
      </button>
      <span>{title}</span>
      <span style={{ width: 40 }} />
    </div>
  );
}

export function EventWizard({
  mode,
  eventId,
  initial,
  preview = false,
}: {
  mode: "create" | "edit";
  eventId?: string;
  initial?: WizardInitial;
  preview?: boolean;
}) {
  const router = useRouter();
  const { toast } = useUI();
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [hasCover, setHasCover] = useState(Boolean(initial));
  const [previewSrc, setPreviewSrc] = useState<string | null>(
    initial?.heroImagePreview ?? (initial?.heroImageUrl && !eventImagePath(initial.heroImageUrl) ? initial.heroImageUrl : null),
  );
  const [mapVenue, setMapVenue] = useState(initial?.venue ?? "");
  const [uploading, setUploading] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(eventId ?? null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const termsRef = useRef<HTMLInputElement | null>(null);

  const today = useMemo(() => todayKey(DEFAULT_TIMEZONE), []);

  useEffect(() => {
    const timer = setTimeout(() => setMapVenue(draft.venue.trim()), 800);
    return () => clearTimeout(timer);
  }, [draft.venue]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const coverEvent = {
    heroImageUrl: hasCover
      ? previewSrc ?? (draft.heroImageUrl && !eventImagePath(draft.heroImageUrl) ? draft.heroImageUrl : null)
      : null,
    colorFrom: draft.colorFrom,
    colorTo: draft.colorTo,
  };

  const addTag = () => {
    const incoming = draft.tagDraft
      .split(",")
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean);
    const tags = [...draft.tags];
    for (const tag of incoming) {
      if (tags.length >= MAX_TAGS) break;
      if (!tags.includes(tag)) tags.push(tag);
    }
    setDraft((current) => ({ ...current, tags, tagDraft: "" }));
  };

  const validateStep = (target: Step): string | null => {
    if (target === 2 || target === 3 || target === 4 || target === "pv" || target === "tc" || target === "ok") {
      if (draft.title.trim().length < 3) return "Add an event name to continue.";
      if (!draft.date) return "Add a date to continue.";
      if (draft.date < today) return "Pick today or a future date.";
    }
    if (target === 3 || target === 4 || target === "pv" || target === "tc" || target === "ok") {
      if (draft.venue.trim().length < 3) return "Add a venue to continue.";
      if (draft.description.trim().length < 10) return "Add a description of at least 10 characters.";
    }
    if (target === "pv" || target === "tc" || target === "ok") {
      if (draft.paid) {
        const chosen = TICKET_MODES.filter((modeKey) => draft.tiers[modeKey].on);
        if (chosen.length === 0) return "Pick at least one reservation mode.";
        if (chosen.some((modeKey) => !(Number(draft.tiers[modeKey].price) > 0))) return "Add a price for each selected mode.";
      }
      if (draft.contacts.length === 0) return "Add at least one RSVP contact.";
      if (draft.contacts.some((contact) => !contactIsValid(contact))) return "Add a valid contact for each RSVP.";
      if (!draft.agreeTerms) return "Please accept the Terms and Conditions.";
    }
    return null;
  };

  const goNext = () => {
    if (step === 4) {
      const error = validateStep("pv");
      if (error) {
        toast(error);
        return;
      }
      addTag();
      setStep("pv");
      return;
    }
    const next = ((step as number) + 1) as Step;
    const error = validateStep(next);
    if (error) {
      toast(error);
      return;
    }
    if (step === 3) addTag();
    setStep(next);
  };

  const goBack = () => {
    if (step === 1) {
      goBackToOrigin(router, "/");
      return;
    }
    if (step === "ok") {
      router.push("/");
      return;
    }
    if (step === "tc") {
      setStep("pv");
      return;
    }
    if (step === "pv") {
      setStep(4);
      return;
    }
    setStep((step - 1) as Step);
  };

  const stepNumber = typeof step === "number" ? step : 4;

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!isSupabaseConfigured) {
      toast(CONFIG_REQUIRED_MESSAGE);
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast("Use a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast("Please choose an image under 5MB.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast("Sign in again to upload images.");
        router.push(`/login?next=${encodeURIComponent("/events/new")}`);
        return;
      }
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(EVENT_IMAGE_BUCKET).upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });
      if (error) {
        toast("Upload failed. Try a smaller image.");
        return;
      }
      // Bucket is private: keep the path for the event and show a short-lived
      // signed URL in the preview.
      const { data: signed } = await supabase.storage
        .from(EVENT_IMAGE_BUCKET)
        .createSignedUrl(path, SIGNED_IMAGE_URL_TTL);
      setDraft((current) => ({ ...current, heroImageUrl: path }));
      setPreviewSrc(signed?.signedUrl ?? null);
      setHasCover(true);
      toast("Image uploaded.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const useCoverArt = () => {
    const palette = COVER_PALETTES[Math.floor(Math.random() * COVER_PALETTES.length)] ?? COVER_PALETTES[0]!;
    setDraft((current) => ({ ...current, heroImageUrl: null, colorFrom: palette[0], colorTo: palette[1] }));
    setPreviewSrc(null);
    setHasCover(true);
  };

  const publish = () => {
    const error = validateStep("tc");
    if (error) {
      toast(error);
      return;
    }

    const payload: EventInput = {
      title: draft.title.trim(),
      category: draft.category,
      visibility: draft.visibility,
      date: draft.date,
      time: draft.time,
      venue: draft.venue.trim(),
      city: draft.city.trim() || undefined,
      description: draft.description.trim(),
      securityNote: draft.securityNote as (typeof SECURITY_OPTIONS)[number],
      identityNote: draft.identityNote as (typeof IDENTITY_OPTIONS)[number],
      tags: draft.tags,
      heroImageUrl: draft.heroImageUrl,
      colorFrom: draft.colorFrom,
      colorTo: draft.colorTo,
      isFree: !draft.paid,
      tickets: draft.paid
        ? TICKET_MODES.filter((modeKey) => draft.tiers[modeKey].on).map((modeKey) => ({
            name: modeKey,
            price: Math.round(Number(draft.tiers[modeKey].price)),
          }))
        : [],
      tables: draft.tables
        .filter((table) => table.seats !== "None" && table.quantity !== "None")
        .map((table) => ({ seats: Number(table.seats), quantity: Number(table.quantity) })),
      contacts: draft.contacts.map((contact) => ({ ...contact, value: contact.value.trim() })),
      agreeTerms: true,
    };

    startTransition(async () => {
      const result =
        mode === "create" ? await createEventAction(payload) : await updateEventAction(eventId ?? "", payload);

      if (!result.ok) {
        toast(result.error);
        return;
      }

      if (mode === "create") {
        setPublishedId(result.id);
        setStep("ok");
        router.refresh();
      } else {
        toast("Changes saved.");
        router.push(`/events/${result.id}`);
        router.refresh();
      }
    });
  };

  const selectedModes = TICKET_MODES.filter((modeKey) => draft.tiers[modeKey].on);
  const allSelected = selectedModes.length === TICKET_MODES.length;

  const previewInstant = draft.date ? toInstant(draft.date, draft.time, DEFAULT_TIMEZONE) : new Date().toISOString();
  const previewLocation = draft.city.trim() ? `${draft.venue || "Venue"}, ${draft.city.trim()}` : draft.venue || "Venue";
  const previewTickets = draft.paid
    ? selectedModes.map((modeKey) => ({ name: modeKey, price: Number(draft.tiers[modeKey].price) || 0 }))
    : [];
  const previewTables = draft.tables
    .filter((table) => table.seats !== "None" && table.quantity !== "None")
    .map((table) => ({ seats: Number(table.seats), quantity: Number(table.quantity) }));

  const body = (() => {
    if (typeof step === "number") {
      if (step === 1) {
        return (
          <>
            <h2>Basic Information</h2>
            <p className="sub">Tell people about your event or party.</p>
            <label className="fl">
              Event / Party Name *
              <input
                className="in"
                value={draft.title}
                maxLength={120}
                placeholder="Summer Vibes Beach Party"
                onChange={(event) => update("title", event.target.value)}
              />
            </label>
            <label className="fl">
              Category *
              <select className="in" value={draft.category} onChange={(event) => update("category", event.target.value as EventCategory)}>
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="fl">Event Type *</div>
            <div className="two">
              {(["public", "private"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={cn("rad", draft.visibility === type && "on")}
                  aria-pressed={draft.visibility === type}
                  onClick={() => update("visibility", type)}
                >
                  {type === "public" ? "Public" : "Private"}
                </button>
              ))}
            </div>
            <label className="fl">
              Date *
              <input
                className="in"
                type="date"
                value={draft.date}
                min={today}
                onChange={(event) => update("date", event.target.value)}
              />
            </label>
            <label className="fl">
              Time *
              <input className="in" type="time" value={draft.time} onChange={(event) => update("time", event.target.value)} />
            </label>
          </>
        );
      }

      if (step === 2) {
        return (
          <>
            <h2>Event Image</h2>
            <p className="sub">Upload an image or let Oblee create a cover for you.</p>
            <label className="dz">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(event) => onUpload(event.target.files?.[0])}
              />
              <span style={{ color: "var(--pri)" }}>{uploading ? <span className="spin2" /> : <Icon name="img" size={38} />}</span>
              <span>
                <b>{uploading ? "Uploading…" : "Tap to upload image"}</b>
                JPG, PNG, WebP (max 5MB)
              </span>
            </label>
            <p style={{ textAlign: "center", color: "var(--mute)", margin: "12px 0", fontSize: 12 }}>or</p>
            <button type="button" className="ai" onClick={useCoverArt}>
              <span className="orb" />
              <span>
                Use Oblee cover art
                <small>Let Oblee build a gradient cover for your event</small>
              </span>
            </button>
            {hasCover ? (
              <div className="pvw" style={coverStyle(coverEvent)}>
                <button
                  type="button"
                  className="rmv"
                  onClick={() => {
                    setDraft((current) => ({ ...current, heroImageUrl: null }));
                    setPreviewSrc(null);
                    setHasCover(false);
                  }}
                >
                  Remove
                </button>
                {draft.title || "Your event"}
              </div>
            ) : null}
          </>
        );
      }

      if (step === 3) {
        return (
          <>
            <h2>Event Details</h2>
            <p className="sub">Add more information about your event.</p>
            <label className="fl">
              Location / Venue *
              <input
                className="in"
                value={draft.venue}
                maxLength={160}
                placeholder="Lekki Beach, Lagos"
                onChange={(event) => update("venue", event.target.value)}
              />
            </label>
            <label className="fl">
              City
              <input
                className="in"
                value={draft.city}
                maxLength={80}
                placeholder="Lagos"
                onChange={(event) => update("city", event.target.value)}
              />
            </label>
            {mapVenue.length > 2 ? (
              <div className="gm" style={{ marginTop: 10 }}>
                <div className="gmph">
                  <div>
                    <b style={{ color: "var(--ink)" }}>{mapVenue}</b>
                    <br />
                    The map loads here
                  </div>
                </div>
                <iframe
                  title={`Map of ${mapVenue}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(mapVenue)}&output=embed`}
                />
              </div>
            ) : null}
            <label className="fl">
              Description *
              <textarea
                className="in"
                maxLength={MAX_DESCRIPTION}
                placeholder="Get ready for an unforgettable night…"
                value={draft.description}
                onChange={(event) => update("description", event.target.value)}
              />
            </label>
            <div style={{ textAlign: "right", fontSize: 11, color: "var(--mute)", marginTop: 4 }}>
              {draft.description.length}/{MAX_DESCRIPTION}
            </div>
            <label className="fl">
              Security
              <select className="in" value={draft.securityNote} onChange={(event) => update("securityNote", event.target.value)}>
                {SECURITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="fl">
              Identity Verification
              <select className="in" value={draft.identityNote} onChange={(event) => update("identityNote", event.target.value)}>
                {IDENTITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="fl">Tags</div>
            <div className="tgrow">
              <input
                className="in"
                value={draft.tagDraft}
                maxLength={24}
                placeholder="e.g. afrobeats, rooftop"
                aria-label="Add a tag"
                onChange={(event) => update("tagDraft", event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag();
                  }
                }}
              />
              <button type="button" className="btn sm" style={{ margin: 0, height: 50, padding: "0 20px" }} onClick={addTag}>
                Add
              </button>
            </div>
            <div className="chips">
              {draft.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="chip"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => update("tags", draft.tags.filter((value) => value !== tag))}
                >
                  #{tag} ×
                </button>
              ))}
            </div>
          </>
        );
      }

      return (
        <>
          <h2>Table Reservations</h2>
          <p className="sub">Let guests book a table at your event.</p>
          <div className="seg">
            <button type="button" className={cn(!draft.paid && "on")} onClick={() => update("paid", false)}>
              Free
            </button>
            <button type="button" className={cn(draft.paid && "on")} onClick={() => update("paid", true)}>
              Paid
            </button>
          </div>

          {draft.paid ? (
            <>
              <div className="fl" style={{ marginTop: 18 }}>
                Mode of reservation
              </div>
              <p className="sub" style={{ marginBottom: 6 }}>
                Pick the modes you offer and set a price for each.
              </p>
              <label className="mode all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setDraft((current) => ({
                      ...current,
                      tiers: {
                        Regular: { ...current.tiers.Regular, on: checked },
                        VIP: { ...current.tiers.VIP, on: checked },
                        VVIP: { ...current.tiers.VVIP, on: checked },
                      },
                    }));
                  }}
                />
                <b>Select all</b>
              </label>
              {TICKET_MODES.map((modeKey) => (
                <div key={modeKey} className={cn("mode", draft.tiers[modeKey].on && "on")}>
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.tiers[modeKey].on}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          tiers: {
                            ...current.tiers,
                            [modeKey]: { ...current.tiers[modeKey], on: event.target.checked },
                          },
                        }))
                      }
                    />
                    <b>{modeKey}</b>
                  </label>
                  {draft.tiers[modeKey].on ? (
                    <input
                      className="in"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder="Price per table, ₦"
                      aria-label={`${modeKey} price`}
                      value={draft.tiers[modeKey].price}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          tiers: {
                            ...current.tiers,
                            [modeKey]: { ...current.tiers[modeKey], price: event.target.value },
                          },
                        }))
                      }
                    />
                  ) : null}
                </div>
              ))}
            </>
          ) : null}

          <div className="fl" style={{ marginTop: 18 }}>
            Tables
          </div>
          <p className="sub" style={{ marginBottom: 6 }}>
            Choose the size of each table and how many you have.
          </p>
          {draft.tables.map((table, index) => (
            <div className="card trow" key={index}>
              <label>
                Table of (seats)
                <select
                  className="in"
                  value={table.seats}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      tables: current.tables.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, seats: event.target.value } : row,
                      ),
                    }))
                  }
                >
                  {TABLE_SEATS.map((seats) => (
                    <option key={seats} value={seats}>
                      {seats}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                No. of tables
                <select
                  className="in"
                  value={table.quantity}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      tables: current.tables.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, quantity: event.target.value } : row,
                      ),
                    }))
                  }
                >
                  {TABLE_COUNTS.map((quantity) => (
                    <option key={quantity} value={quantity}>
                      {quantity}
                    </option>
                  ))}
                </select>
              </label>
              {draft.tables.length > 1 ? (
                <button
                  type="button"
                  className="rmt"
                  aria-label="Remove this table"
                  onClick={() => update("tables", draft.tables.filter((_, rowIndex) => rowIndex !== index))}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            className="btn o"
            style={{ width: "100%", flex: "none", height: 46, marginTop: 12 }}
            onClick={() => update("tables", [...draft.tables, { seats: "4", quantity: "1" }])}
          >
            + Add more table
          </button>

          <div className="fl" style={{ marginTop: 22, fontSize: 15 }}>
            RSVP
          </div>
          <p className="sub" style={{ marginBottom: 0 }}>
            How should guests respond?
          </p>

          {draft.contacts.map((contact, index) => (
            <div className="card rv" key={index}>
              {draft.contacts.length > 1 ? (
                <button
                  type="button"
                  className="rmt"
                  aria-label="Remove this RSVP"
                  onClick={() => update("contacts", draft.contacts.filter((_, rowIndex) => rowIndex !== index))}
                >
                  ×
                </button>
              ) : null}
              <div className="rs" style={{ marginTop: 0 }}>
                {CONTACT_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={cn(contact.kind === kind && "on")}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        contacts: current.contacts.map((row, rowIndex) =>
                          rowIndex === index
                            ? { kind, caption: CONTACT_CAPTIONS[kind][0]!, countryCode: row.countryCode || "+234", value: "" }
                            : row,
                        ),
                      }))
                    }
                  >
                    <span style={{ color: CONTACT_COLORS[kind] }}>
                      <Icon name={CONTACT_ICONS[kind]} size={22} />
                    </span>
                    {kind === "whatsapp" ? "WhatsApp" : kind === "call" ? "Call" : "Email"}
                  </button>
                ))}
              </div>
              <label className="fl">
                Button caption
                <select
                  className="in"
                  value={contact.caption}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      contacts: current.contacts.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, caption: event.target.value } : row,
                      ),
                    }))
                  }
                >
                  {(CONTACT_CAPTIONS[contact.kind] ?? []).map((caption) => (
                    <option key={caption} value={caption}>
                      {caption}
                    </option>
                  ))}
                </select>
              </label>
              <div className="fl">
                {contact.kind === "email" ? "Email address" : contact.kind === "whatsapp" ? "WhatsApp number" : "Phone number"}
              </div>
              {contact.kind === "email" ? (
                <input
                  className="in"
                  type="email"
                  inputMode="email"
                  value={contact.value}
                  placeholder="events@example.com"
                  aria-label="RSVP email"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      contacts: current.contacts.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, value: event.target.value } : row,
                      ),
                    }))
                  }
                />
              ) : (
                <div className="ccrow">
                  <select
                    className="in"
                    aria-label="Country code"
                    value={contact.countryCode}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        contacts: current.contacts.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, countryCode: event.target.value } : row,
                        ),
                      }))
                    }
                  >
                    {COUNTRY_CODES.map(([country, code]) => (
                      <option key={code} value={code}>
                        {country} {code}
                      </option>
                    ))}
                  </select>
                  <input
                    className="in"
                    type="tel"
                    inputMode="numeric"
                    value={contact.value}
                    placeholder="801 234 5678"
                    aria-label="Phone number"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        contacts: current.contacts.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, value: event.target.value } : row,
                        ),
                      }))
                    }
                  />
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            className="btn o"
            style={{ width: "100%", flex: "none", height: 46, marginTop: 12 }}
            onClick={() =>
              update("contacts", [
                ...draft.contacts,
                { kind: "call", caption: CONTACT_CAPTIONS.call[0]!, countryCode: "+234", value: "" },
              ])
            }
          >
            + Add another RSVP
          </button>

          <label className="ck">
            <input
              type="checkbox"
              checked={draft.agreeTerms}
              onChange={(event) => update("agreeTerms", event.target.checked)}
            />
            <span>
              I agree to the Oblee{" "}
              <Link href="/terms" target="_blank" className="link">
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="link">
                Privacy Policy
              </Link>
            </span>
          </label>
        </>
      );
    }

    if (step === "pv") {
      return (
        <>
          <div
            className="pvw"
            style={{ ...coverStyle(coverEvent), height: 200, marginTop: 0 }}
          >
            <span className="tg" style={{ "--t": categoryColor(draft.category), top: "auto", bottom: 12 } as React.CSSProperties}>
              {categoryLabel(draft.category)}
            </span>
          </div>
          <h2 style={{ marginTop: 16 }}>{draft.title || "Your event"}</h2>
          <div className="row">
            <Icon name="cal" size={18} />
            {formatEventDate(previewInstant, DEFAULT_TIMEZONE)}, {formatTime(previewInstant, DEFAULT_TIMEZONE)}
          </div>
          <div className="row">
            <Icon name="pin" size={18} />
            {previewLocation}
          </div>
          <div className="gm" style={{ marginTop: 10, height: 160 }}>
            <div className="gmph">
              <div>
                <b style={{ color: "var(--ink)" }}>{previewLocation}</b>
                <br />
                The map loads here
              </div>
            </div>
            <iframe
              title={`Map of ${previewLocation}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(previewLocation)}&output=embed`}
            />
          </div>
          <div className="tl">
            <div>
              <i>
                <Icon name="shield" size={18} />
              </i>
              <span>
                Security
                <b>{draft.securityNote}</b>
              </span>
            </div>
            <div>
              <i>
                <Icon name="idc" size={18} />
              </i>
              <span>
                Identity
                <b>{draft.identityNote}</b>
              </span>
            </div>
          </div>
          {draft.tags.length > 0 ? (
            <div className="chips">
              {draft.tags.map((tag) => (
                <span className="chip" key={tag}>
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          <div className="card">
            <b>Table Reservations</b>
            <div className="chips">
              {previewTickets.length > 0 ? (
                previewTickets.map((ticket) => (
                  <span className="chip" key={ticket.name}>
                    {ticket.name} ₦{ticket.price.toLocaleString("en-US")}
                  </span>
                ))
              ) : (
                <span className="chip">Free</span>
              )}
            </div>
            <div style={{ color: "var(--mute)", fontSize: 12.5, marginTop: 8 }}>
              {previewTables.length > 0
                ? previewTables.map((table) => `${table.quantity} × table of ${table.seats}`).join(", ")
                : "No tables"}
            </div>
          </div>
          <div className="card">
            <b>RSVP</b>
            {draft.contacts.map((contact, index) => (
              <div className="row" style={{ marginTop: 8 }} key={index}>
                <span style={{ color: CONTACT_COLORS[contact.kind] }}>
                  <Icon name={CONTACT_ICONS[contact.kind]} size={18} />
                </span>
                <span style={{ minWidth: 0 }}>
                  {contact.caption}
                  {contact.value ? `, ${contact.kind === "email" ? contact.value : `${contact.countryCode} ${contact.value}`}` : ""}
                </span>
              </div>
            ))}
          </div>
          <p style={{ color: "var(--mute)", fontSize: 12.5, marginTop: 14 }}>{draft.description}</p>
        </>
      );
    }

    if (step === "tc") {
      return (
        <>
          <h2 style={{ fontSize: 17 }}>Oblee Event Posting Terms</h2>
          <p className="sub" style={{ marginTop: 8 }}>
            By posting an event on Oblee, you agree to the following terms and conditions:
          </p>
          <ol className="tm">
            <li>You confirm that you have the right to post this event and that all information is accurate.</li>
            <li>You agree to comply with all applicable laws and regulations.</li>
            <li>You will not post any harmful, illegal, misleading or copyrighted content.</li>
            <li>Oblee reserves the right to remove or edit any event at any time without notice.</li>
            <li>You are responsible for managing your RSVPs, table bookings and communication with guests.</li>
            <li>Oblee is not liable for any loss, damage or incident that occurs during your event.</li>
          </ol>
          <label className="ck">
            <input
              ref={termsRef}
              type="checkbox"
              checked={draft.agreeTerms}
              onChange={(event) => update("agreeTerms", event.target.checked)}
            />
            <span>
              I agree to the Oblee{" "}
              <Link href="/terms" target="_blank" className="link">
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="link">
                Privacy Policy
              </Link>
            </span>
          </label>
        </>
      );
    }

    return (
      <div className="ok" style={{ padding: "64px 0 0" }}>
        <div className="orbL" aria-hidden="true" />
        <div className="chk">
          <Icon name="check" size={26} />
        </div>
        <h2>Event Posted Successfully!</h2>
        <p>Your event has been published and is now visible to the Oblee community.</p>
        <Link className="btn" href={publishedId ? `/events/${publishedId}` : "/"}>
          View Event
        </Link>
        <Link className="btn o" href="/">
          Go to Home
        </Link>
      </div>
    );
  })();

  const bar = (() => {
    if (typeof step === "number") {
      return (
        <div className="bar">
          {step > 1 ? (
            <button type="button" className="btn o" onClick={goBack}>
              Back
            </button>
          ) : null}
          <button type="button" className="btn" onClick={goNext}>
            {step === 4 ? "Review & Publish" : "Next →"}
          </button>
        </div>
      );
    }
    if (step === "pv") {
      return (
        <div className="bar">
          <button type="button" className="btn o" onClick={goBack}>
            Back
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => (mode === "create" ? setStep("tc") : publish())}
            disabled={pending}
          >
            {mode === "create" ? "Publish" : "Save changes"}
          </button>
        </div>
      );
    }
    if (step === "tc") {
      return (
        <div className="bar">
          {mode === "create" ? (
            <button type="button" className="btn" onClick={publish} disabled={!draft.agreeTerms || pending}>
              {pending ? <span className="spin2" /> : null}
              {pending ? "Publishing…" : "Continue"}
            </button>
          ) : (
            <button type="button" className="btn" onClick={publish} disabled={pending}>
              {pending ? <span className="spin2" /> : null}
              {pending ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      );
    }
    return null;
  })();

  const heading =
    typeof step === "number"
      ? mode === "edit"
        ? "Edit Event"
        : "Create New Event"
      : step === "pv"
        ? mode === "edit"
          ? "Review Changes"
          : "Review Your Event"
        : step === "tc"
          ? "Terms & Conditions"
          : "Event Posted";

  if (step === "ok") {
    return (
      <div className="page">
        <div className="body">{body}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header title={heading} onBack={goBack} />
      {typeof step === "number" ? (
        <div className="stp">
          {STEP_LABELS.map((label, index) => (
            <div
              key={label}
              className={cn(index + 1 < stepNumber && "d", index + 1 === stepNumber && "d a")}
              aria-current={index + 1 === stepNumber ? "step" : undefined}
            >
              <i>{index + 1}</i>
              {label}
            </div>
          ))}
        </div>
      ) : null}
      <div className="body cb">
        {preview ? (
          <p className="note" style={{ marginBottom: 12 }}>
            Preview mode. You can build a listing here, but publishing needs Supabase. Add the environment variables, then run
            the migrations.
          </p>
        ) : null}
        {body}
      </div>
      {bar}
    </div>
  );
}
