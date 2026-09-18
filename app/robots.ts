import type { MetadataRoute } from "next";
import { CANONICAL_PUBLIC_SITE_URL } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/operator/"] },
    sitemap: new URL("/sitemap.xml", CANONICAL_PUBLIC_SITE_URL).toString(),
    host: CANONICAL_PUBLIC_SITE_URL.origin,
  };
}
