# Landing story

Owns the landing page's product narrative, demo request interactions, and demo destination links. `LandingShell` composes the page sections; the request and link modules expose the validation and destination behavior consumed by the page and its API route.

The landing route decides whether to show the chain section. The App Router owns `/api/demo-request`, SEO metadata, and routing; this feature owns the form data contract and visible request flow. Privacy consent and policy links belong to this feature. Visual sections are children of this story, not separate product modules.

Run `pnpm --filter @pizzaos/landing test` for its page and form coverage.
