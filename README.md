# iObservatory Boilerplate Stack

This is a Docker-based boilerplate stack for building a **data-driven Impact Observatory platform**, combining open-source tools like MediaWiki, Strapi, Apache Hop, PostgreSQL, and MinIO. The architecture is designed to be modular, extensible, and privacy-conscious.

> ⚠️ This repository is a **starting point**, not a plug-and-play solution. Some configuration and initialization steps are required before use.

## 🧱 Stack Components

| Service       | Role                              | Access URL (relative) |
|---------------|-----------------------------------|------------------------|
| MediaWiki     | Knowledge base                    | `/mediawiki/`         |
| Strapi        | API + content management          | `/strapi/`            |
| Apache Hop    | ETL and data pipeline orchestration | `/hop/`             |
| MinIO         | Object storage (S3-compatible)    | `/minio/`             |
| PostgreSQL    | Database for Strapi & Hop         | —                      |
| MariaDB       | Database for MediaWiki            | —                      |
| phpMyAdmin    | MariaDB UI                        | `/pma/`               |
| pgAdmin       | PostgreSQL UI                     | `/pga/`               |
| nginx-proxy   | Auto-routing and HTTPS termination| —                      |
| acme-companion| LetsEncrypt SSL cert automation   | —                      |

## 🚀 Quick Start

```bash
# Step 1: Copy .env files and configure secrets
cp services/mediawiki/.env.example services/mediawiki/.env
cp services/strapi/.env.example services/strapi/.env
...

# Step 2: Launch stack
make up

# Step 3: Visit the services via https://${DOMAIN_NAME}
📁 Directory Structure

services/
  mediawiki/
  strapi/
  postgres/
  mariadb/
  hop/
  minio/
docs/
certs/
logs/
.env*       → All .env files are per service and .gitignored
