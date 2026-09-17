# Internal design

Move `admin-shell.tsx` and its CSS module together to `src/composition`. Update route and test imports. Preserve all internal control flow and state. The app-level composition folder is the common owner of sibling feature coordination.

Checklist: route preserved; store switching preserved; local simulation preserved; tests and typecheck pass.
