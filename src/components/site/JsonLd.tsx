/** Dades estructurades. `<` s'escapa perquè cap text no pugui tancar l'etiqueta <script>. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
