import type { MetadataRoute } from "next";
import { CANONICAL_PUBLIC_SITE_URL } from "@/lib/site-config";

const routes = ["/", "/officials/", "/how-it-works/", "/research/", "/app/", "/about/"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((pathname) => ({
    url: new URL(pathname, CANONICAL_PUBLIC_SITE_URL).toString(),
    changeFrequency: pathname === "/officials/" ? "daily" : "weekly",
  }));
}
