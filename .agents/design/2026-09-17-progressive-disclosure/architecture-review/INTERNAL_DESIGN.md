# Internal design

Use a small repository script to scan source import specifiers and enforce stable cross-workspace boundaries. Update root and app READMEs bottom-up. Review unresolved client feature coupling and record it without adding a new runtime abstraction.

Checklist: command documented; guard verified with a violating fixture; READMEs reflect current locations; import graph reviewed; git status clean except expected files.
