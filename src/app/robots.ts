import type { MetadataRoute } from "next";
import { deploymentUrl, isIndexable } from "@/lib/deployment";

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${deploymentUrl()}/sitemap.xml` };
}
