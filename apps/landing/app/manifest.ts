import type { MetadataRoute } from "next";
import { createLandingManifest } from "./seo";

export default function manifest(): MetadataRoute.Manifest {
  return createLandingManifest();
}
