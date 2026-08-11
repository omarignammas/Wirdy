# Security Policy

## Reporting

Please report security issues privately to the repository owner rather than
opening a public issue. Include reproduction steps, affected platforms, and the
impact on local account data, backups, or reading history.

## Data Model

Wirdy is local-first. Account credentials are salted and hashed before being
stored through Expo SecureStore. Reading data is stored in the application
SQLite database. The app does not provide a remote account or synchronization
service.

Exported JSON backups should be treated as sensitive user files. Production
integrations must never upload them without clear, explicit user consent.
