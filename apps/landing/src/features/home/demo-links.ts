export interface DemoSuccessLink {
  readonly label: string;
  readonly href: string;
}

export interface DemoSuccessLinkConfig {
  readonly clientHref?: string;
  readonly adminHref?: string;
}

export type DemoSuccessLinks = readonly [DemoSuccessLink, DemoSuccessLink];

export const DEFAULT_DEMO_SUCCESS_LINKS: DemoSuccessLinks = [
  { label: "Demo Web-App Cliente", href: "/client" },
  { label: "Demo Dashboard Admin", href: "/admin" },
];

export function createDemoSuccessLinks({
  clientHref = DEFAULT_DEMO_SUCCESS_LINKS[0].href,
  adminHref = DEFAULT_DEMO_SUCCESS_LINKS[1].href,
}: DemoSuccessLinkConfig = {}): DemoSuccessLinks {
  return [
    { ...DEFAULT_DEMO_SUCCESS_LINKS[0], href: clientHref },
    { ...DEFAULT_DEMO_SUCCESS_LINKS[1], href: adminHref },
  ];
}
