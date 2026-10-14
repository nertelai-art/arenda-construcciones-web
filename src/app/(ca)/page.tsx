import { homeMetadata, HomeView } from "@/views/home";

export const metadata = homeMetadata("ca");

export default function Page() {
  return <HomeView locale="ca" />;
}
