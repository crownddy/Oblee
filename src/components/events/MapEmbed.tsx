import { mapEmbedUrl } from "@/lib/utils/format";

export function MapEmbed({ venue, label }: { venue: string; label?: string }) {
  return (
    <div className="gm">
      <div className="gmph">
        <div>
          <b style={{ color: "var(--ink)" }}>{label ?? venue}</b>
          <br />
          The map loads here
        </div>
      </div>
      <iframe
        title={`Map of ${venue}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        src={mapEmbedUrl(venue)}
      />
    </div>
  );
}
