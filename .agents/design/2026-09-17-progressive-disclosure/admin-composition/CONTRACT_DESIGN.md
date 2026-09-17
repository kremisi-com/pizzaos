# Public contract

```tsx
/** Renders the admin application shell with local demo state and operational sections. */
export declare function AdminShell(): React.ReactElement;
```

Precondition: browser storage may be available or absent. Postcondition: the same admin route and interactions render. Storage and simulation errors retain existing recovery behavior. Example: changing the active store changes the visible orders and KPIs.
