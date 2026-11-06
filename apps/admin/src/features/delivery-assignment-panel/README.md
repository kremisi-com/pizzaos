# Delivery assignment panel

Owns the Italian operator UI for rider access enablement, activation/deactivation, and manual assignment or reassignment of ready/in-transit delivery orders. The panel consumes `DeliveryAdminApi` and authoritative orders supplied by the composition; it never imports service or composition internals.

Enabling a rider grants access for the specified identity; the UI does not claim an invitation email was sent. Failed deliveries show the existing issue and can be reassigned to retry. Cancellation and refunds remain in the canonical order actions outside this panel. No map, GPS, or sample riders are shown.

Public props and observable requirements are in `.agents/design/2026-11-05-pilot-integration/operational-surfaces/`. Data resets when the selected store changes; `refreshVersion` reloads the two server lists when the composition refreshes order data.

`riderHref` is an optional navigation target supplied by the app composition. Its default `/rider` preserves the single-host local entry; the server pages pass the configured rider origin for separate hosts. The feature does not read deployment configuration or infer a domain from browser headers.
