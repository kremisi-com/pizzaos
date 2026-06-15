import Script from "next/script";
import type { ReactElement } from "react";

export const googleTagId = "G-VVZ3HVXHX8";

export function createGoogleTagInitScript(tagId: string): string {
  return `
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${tagId}');
`;
}

export function GoogleTag(): ReactElement {
  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`}
        strategy="afterInteractive"
      />
      <Script
        id="pizzaos-client-google-tag"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: createGoogleTagInitScript(googleTagId),
        }}
      />
    </>
  );
}
