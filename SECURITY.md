# Security Policy

## Supported versions

Security fixes are provided for the latest released minor version.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository. Do not open a public issue for a suspected vulnerability and do not attach real family data to any report.

Include the affected version, a minimal fictional proof of concept, impact, and suggested mitigation when available. You should receive an acknowledgement within seven days.

## Privacy model

The package performs in-memory computation only. It does not send network requests, persist graphs, load remote code, or collect analytics. The hosted playground uses the same local-only model and has no backend.

Applications embedding the package remain responsible for access control, encryption, retention, consent, and deletion of their own data.
