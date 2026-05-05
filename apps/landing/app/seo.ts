import type { Metadata, MetadataRoute, Viewport } from "next";

const defaultSiteUrl = "https://pizzaos.it";

export const landingSiteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl,
);

export const landingSeoDescription =
  "PizzaOS è la piattaforma premium per pizzerie moderne: ordini online, menu dinamico, marketing automatico, analytics AI e controllo operativo senza commissioni marketplace.";

export const landingMetadata: Metadata = {
  metadataBase: landingSiteUrl,
  applicationName: "PizzaOS",
  title: {
    default: "PizzaOS | Software premium per pizzerie moderne",
    template: "%s | PizzaOS",
  },
  description: landingSeoDescription,
  keywords: [
    "PizzaOS",
    "software pizzeria",
    "gestionale pizzeria",
    "ordini online pizzeria",
    "menu digitale pizzeria",
    "marketing automatico ristorante",
    "analytics ristorante",
    "food tech Italia",
    "delivery pizzeria",
    "fidelity pizzeria",
  ],
  authors: [{ name: "PizzaOS" }],
  creator: "PizzaOS",
  publisher: "PizzaOS",
  category: "Restaurant technology",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      {
        url: "/favicon/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/favicon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "PizzaOS",
    title: "PizzaOS | Software premium per pizzerie moderne",
    description: landingSeoDescription,
    locale: "it_IT",
    images: [
      {
        url: "/images/hero/admin-dashboard.png",
        width: 1448,
        height: 1086,
        alt: "Dashboard operativa PizzaOS per ordini, analytics e marketing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PizzaOS | Software premium per pizzerie moderne",
    description: landingSeoDescription,
    images: ["/images/hero/admin-dashboard.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const landingViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#FAF8F6",
};

export function createLandingRobots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: new URL("/sitemap.xml", landingSiteUrl).toString(),
  };
}

export function createLandingSitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: landingSiteUrl.toString(),
      lastModified: new Date("2026-05-05"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}

export function createLandingManifest(): MetadataRoute.Manifest {
  return {
    name: "PizzaOS",
    short_name: "PizzaOS",
    description: landingSeoDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAF8F6",
    theme_color: "#F43A26",
    lang: "it",
    categories: ["business", "food", "productivity"],
    icons: [
      {
        src: "/favicon/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
