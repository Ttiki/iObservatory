# Setup Guide

## 1. Prepare Environment Variables

Each service has a `.env.example`. Duplicate and edit it:

```bash
cp services/mediawiki/.env.example services/mediawiki/.env
cp services/strapi/.env.example services/strapi/.env
...
```
## 2. Start the Stack
```bash
make up
```
You can also use Docker Compose directly:
```bash
docker compose up -d --build
```
## 3. Service-Specific Setup

### MediaWiki
Run maintenance/install.php once the container is up
Ensure MariaDB is ready and accessible

### Strapi
Visit /strapi/ to create the admin user
Configure content types, roles, and upload settings

### Apache Hop
Navigate to /hop/
Load or import your project under /project

## 4. Access Admin Panels

| Tool | Path |
|-|-|
| phpMyAdmin | /pma/ |
| pgAdmin	| /pga/ |
| MinIO console | /minio/ |
