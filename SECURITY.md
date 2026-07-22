# Security policy

## Supported version

Security fixes are applied to the latest `2.x` release.

## Safe deployment

LocalChat is a single-user, local-first application. It listens on `127.0.0.1` by default and does not provide user authentication. Do not bind it to a public or untrusted network interface without adding authentication, TLS, request limits, and appropriate firewall rules.

Treat GGUF files as third-party artifacts. Download models from sources you trust, verify checksums when publishers provide them, and review each model's license.

## Reporting a vulnerability

Please report vulnerabilities privately to the project maintainer. Include affected versions, reproduction steps, impact, and any suggested mitigation. Avoid publishing exploit details before a fix is available.
