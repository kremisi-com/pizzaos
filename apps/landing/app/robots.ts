import type { MetadataRoute } from "next";
import { createLandingRobots } from "./seo";

export default function robots(): MetadataRoute.Robots {
  return createLandingRobots();
}
