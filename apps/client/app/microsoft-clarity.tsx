import Script from "next/script";
import type { ReactElement } from "react";

export const clarityProjectIdEnvName = "NEXT_PUBLIC_CLARITY_PROJECT_ID";

export function createMicrosoftClarityBootstrapScript(projectId: string): string {
  return `
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", ${JSON.stringify(projectId)});
`;
}

export function MicrosoftClarity(): ReactElement | null {
  const clarityProjectId = process.env[clarityProjectIdEnvName];

  if (!clarityProjectId) {
    return null;
  }

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: createMicrosoftClarityBootstrapScript(clarityProjectId),
      }}
    />
  );
}
