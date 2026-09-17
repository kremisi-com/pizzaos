# Public contract

```text
pnpm architecture:check
```

Precondition: run at repository root. Postcondition: exit code 0 when checked boundaries hold, nonzero with file locations for violations. Example: a package import of `apps/client` reports a violation.
