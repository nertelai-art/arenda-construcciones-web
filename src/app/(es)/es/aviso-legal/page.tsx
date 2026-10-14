import { legalMetadata, LegalView } from "@/views/legal";

export const metadata = legalMetadata("es");

export default function Page() {
  return <LegalView locale="es" />;
}
