# Landing story

Owns the landing page's product narrative, demo request interactions, and demo destination links. `LandingShell` composes the page sections; the request and link modules expose the validation and destination behavior consumed by the page and its API route.

The landing route decides whether to show the chain section. The App Router owns `/api/demo-request`, SEO metadata, and routing; this feature owns the form data contract and visible request flow. Privacy consent and policy links belong to this feature. Visual sections are children of this story, not separate product modules.

The existing mail endpoint must accept the submission before the landing issues a pass. Both demo and free-trial CTAs use that path. The FAQ contact submission keeps its previous response. The successful demo modal posts each pass to its destination app in a new tab, and an unconfigured handoff keeps the manual `/poc` links. See [the POC flow](../../../../../.agents/product-definition/flows/poc-and-interface.md).

Run `pnpm --filter @pizzaos/landing test` for its page and form coverage.
