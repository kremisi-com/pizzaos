# Observable requirements

- Visiting admin `/` renders the same dashboard and sections as before. For example, the operator can still switch stores and see the dataset change.
- Existing local admin state, reset, new-order notifications, and deterministic simulation have unchanged visible results.
- The admin shell is discoverable at the app composition boundary; `home` does not own other operational features.
