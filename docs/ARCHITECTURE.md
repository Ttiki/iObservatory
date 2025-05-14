# System Architecture

This document provides a high-level overview of the Impact Observatory stack, powered by Docker Compose. The stack is modular and service-oriented, with strict separation of concerns and service-specific `.env` files.

## 🌐 Core Network

All services are connected via the custom bridge network:

observatory_net


It ensures inter-container communication while keeping internal services isolated from the host, except for those exposed via the reverse proxy.

---

## 🧩 Services Overview

### 📚 Content & Knowledge Layer

- **MediaWiki**
  - Used for collaborative article writing and structured knowledge.
  - Backend: `mariadb`
  - Accessible at: `https://<DOMAIN_NAME>/mediawiki/`
  - Mounted configs: `LocalSettings.php`, `composer.local.json`

- **Strapi**
  - Used as a Headless CMS for structured data, APIs, and integration with other platforms.
  - Backend: `postgres`
  - Accessible at: `https://<DOMAIN_NAME>/strapi/`

- **MinIO**
  - S3-compatible object storage for uploads, backups, and shared data.
  - Accessible at: `https://<DOMAIN_NAME>/minio/` (web console)
  - Internal port: `9000`

---

### 📊 Data Management & Processing

- **PostgreSQL**
  - Main relational DB for Strapi and Apache Hop.
  - Persistent volume: `dw-data`

- **MariaDB**
  - Relational DB for MediaWiki.
  - Persistent volume: `mariadb`

- **Apache Hop**
  - ETL tool to automate, transform, and feed data pipelines into PostgreSQL.
  - Accessible at: `https://<DOMAIN_NAME>/hop/`

---

### 🛠 Admin Tools

- **phpMyAdmin**
  - Admin panel for MariaDB
  - Accessible at: `https://<DOMAIN_NAME>/pma/`

- **pgAdmin**
  - Admin panel for PostgreSQL
  - Accessible at: `https://<DOMAIN_NAME>/pga/`

---

### 🌐 Proxy & HTTPS

- **nginx-proxy**
  - Automatically reverse proxies HTTP/HTTPS requests based on container env variables.
  - Detects containers via Docker socket.

- **acme-companion**
  - Automatically handles Let's Encrypt SSL certificates for each proxied service.
  - Uses `LETSENCRYPT_EMAIL` and domain environment config.

---

## 📦 Volumes Used

| Volume Name       | Description                                |
|-------------------|--------------------------------------------|
| `mariadb`         | MariaDB data                               |
| `dw-data`         | PostgreSQL data                            |
| `pgadmin-volume`  | Persistent pgAdmin configuration           |
| `certs`           | SSL certificates from acme-companion       |
| `html`            | Static site or default nginx content       |
| `acme`            | ACME challenge-related files               |
| `minio`           | MinIO object storage (mounted under `/data`) |

---

## ⚙️ Flow Summary

User Browser
│
▼
[nginx-proxy + acme-companion]
│
├── /mediawiki/ ───> MediaWiki ──> MariaDB
├── /strapi/ ─────> Strapi ──────> PostgreSQL
├── /hop/ ────────> Apache Hop ──> PostgreSQL
├── /pma/ ────────> phpMyAdmin ──> MariaDB
├── /pga/ ────────> pgAdmin ─────> PostgreSQL
└── /minio/ ──────> MinIO


---

## 🔒 Security Notes

- All exposed services are HTTPS-secured via Let's Encrypt.
- Each service uses a `.env` file for credentials — **never committed**.
- You must validate `LETSENCRYPT_EMAIL` and `DOMAIN_NAME` for correct SSL issuance.

---

## ⛔ Known Manual Steps (Pre-Launch)

- MediaWiki must be manually installed using `maintenance/install.php`
- Strapi admin user setup via browser on first boot
- Apache Hop project configuration must be imported
