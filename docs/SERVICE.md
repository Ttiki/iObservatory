# Service Overview

Each service is Dockerized and configured via its own `.env` file.

---

## MediaWiki
- **URL**: `/mediawiki/`
- **DB**: MariaDB
- **Volumes**:
  - `images/`
  - `extensions/`
  - `LocalSettings.php` (read-only)

## Strapi
- **URL**: `/strapi/`
- **DB**: PostgreSQL
- **Volumes**:
  - `config/`, `src/`
  - `public/uploads/`

## Apache Hop
- **URL**: `/hop/`
- **DB**: PostgreSQL
- **Volume**: `projects/` (mounted to `/project`)

## MinIO
- **URL**: `/minio/`
- **Volumes**: `/services/minio/data/`

## PostgreSQL
- **Used by**: Strapi, Apache Hop
- **Volume**: `dw-data/`

## MariaDB
- **Used by**: MediaWiki
- **Volume**: `mariadb/`

## phpMyAdmin
- **URL**: `/pma/`
- **For**: MariaDB

## pgAdmin
- **URL**: `/pga/`
- **For**: PostgreSQL

## nginx-proxy & acme-companion
- Auto HTTPS via Docker labels and Let's Encrypt
