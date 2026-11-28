/**
 * Renders one JSON-LD block. The payload is serialised by `serializeJsonLd`,
 * which escapes `<` and `>`, so event text cannot close the script element.
 */
export function JsonLd({ data }: { data: string }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: data }} />;
}
