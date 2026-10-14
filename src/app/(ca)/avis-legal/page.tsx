import { legalMetadata, LegalView } from "@/views/legal";

export const metadata = legalMetadata("ca");

export default function Page() {
  return <LegalView locale="ca" />;
}
