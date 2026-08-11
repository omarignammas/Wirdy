# Contributing

Thank you for improving Wirdy.

1. Create a focused branch from `main`.
2. Keep UI changes bilingual and verify both RTL and LTR layouts.
3. Preserve the local-first data model and use transactions for multi-row
   SQLite writes.
4. Run `npm run verify` before opening a pull request.
5. Do not modify bundled Quran text or replace third-party data without
   reviewing its source terms and updating the integrity manifest.

Pull requests should describe the user-facing behavior, persistence impact,
test coverage, and any platform permissions introduced by the change.
