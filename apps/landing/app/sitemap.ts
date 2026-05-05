import type { MetadataRoute } from "next";
import { createLandingSitemap } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return createLandingSitemap();
}
