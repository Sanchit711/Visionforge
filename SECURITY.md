# Security Policy

## Supported Versions

| Version | Supported          |
| :--- | :---: |
| 1.0.x (Community) | ✅ Yes |
| < 1.0.0 | ❌ No |

---

## Reporting a Vulnerability

The security of VisionForge Studio and the integrity of user datasets and model weights are of highest priority.

If you discover a security vulnerability in VisionForge Studio, please do **NOT** open a public GitHub issue. Instead, report it privately via GitHub Security Advisories or contact the repository maintainer directly.

### What to Include:
1. Type of issue (e.g. buffer overflow, credential exposure, path traversal, SQL injection).
2. Step-by-step instructions or proof-of-concept script to reproduce the issue.
3. Affected components (backend, frontend, database, API endpoint).
4. Any proposed fixes or remediations.

### Response Timeline:
- **Initial Response**: Within 48 hours.
- **Triage & Assessment**: Within 5 business days.
- **Security Patch Release**: Distributed as an emergency minor release.

---

## Credential Protection Policy

- VisionForge strictly prevents git commits containing `.env`, `kaggle.json`, cloud access keys, or private video footage via the root `.gitignore`.
- Always use `.env.example` as a template for local environment variables.
