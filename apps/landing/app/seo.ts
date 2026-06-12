import type { Metadata, MetadataRoute, Viewport } from "next";

const defaultSiteUrl = "https://www.pizzaos.app";

export const landingSiteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl,
);

export const landingSeoTitle =
  "PizzaOS | Gestionale per pizzerie: ordini, marketing e analytics";

export const landingSeoDescription =
  "PizzaOS è il gestionale per pizzerie moderne: ordini online, menu digitale, marketing automatico, analytics AI e controllo operativo senza commissioni marketplace.";

export const landingSocialImage = {
  url: "/social/og-image.png",
  width: 1200,
  height: 630,
  alt: "Logo PizzaOS e promessa prodotto per pizzerie moderne",
  type: "image/png",
} as const;

export const landingSocialImageUrl = new URL(
  landingSocialImage.url,
  landingSiteUrl,
).toString();

export const landingMetadata: Metadata = {
  metadataBase: landingSiteUrl,
  applicationName: "PizzaOS",
  title: {
    default: landingSeoTitle,
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
    "CRM pizzeria",
    "software delivery ristorante",
    "gestionale ordini ristorante",
  ],
  authors: [{ name: "PizzaOS" }],
  creator: "PizzaOS",
  publisher: "PizzaOS",
  category: "Software per ristorazione",
  alternates: {
    canonical: "/",
    languages: {
      "it-IT": "/",
    },
  },
  icons: {
    icon: [
      {
        url: "/brand/icon-color.svg",
        type: "image/svg+xml",
      },
      {
        url: "/favicon/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon/favicon-16x16.png",
        sizes: "16x16",
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
    title: landingSeoTitle,
    description: landingSeoDescription,
    locale: "it_IT",
    images: [landingSocialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: landingSeoTitle,
    description: landingSeoDescription,
    images: [landingSocialImageUrl],
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
  appleWebApp: {
    capable: true,
    title: "PizzaOS",
    statusBarStyle: "default",
  },
  other: {
    "og:image:secure_url": landingSocialImageUrl,
    "og:image:type": landingSocialImage.type,
    "twitter:image:alt": landingSocialImage.alt,
  },
};

export const landingViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#0A384F",
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
    background_color: "#FAF7F1",
    theme_color: "#0A384F",
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

export function createLandingJsonLd(): Record<string, unknown>[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "PizzaOS",
      url: landingSiteUrl.toString(),
      logo: new URL("/brand/icon-color.svg", landingSiteUrl).toString(),
      sameAs: [landingSiteUrl.toString()],
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "PizzaOS",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "it-IT",
      description: landingSeoDescription,
      image: landingSocialImageUrl,
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
      },
      publisher: {
        "@type": "Organization",
        name: "PizzaOS",
      },
    },
  ];
}
