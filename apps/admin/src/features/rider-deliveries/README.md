# Rider deliveries

Owns the mobile rider view for assignments, dispatch/completion, and delivery failure reports. The feature consumes `RiderDeliveryApi` from the public domain package; composition owns Auth.js login URLs, HTTP transport, and `/rider` routing.

No mock delivery data or GPS map is used. The server remains authoritative; actions refresh the assigned-delivery list. Rider membership does not grant access to operator settings, analytics, refunds, or unassigned orders.
