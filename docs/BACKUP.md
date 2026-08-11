# Backup and Restore Guide

How to backup and restore your databases safely.

---

## Backup MariaDB

Backup your MediaWiki database:

```bash
make backup-mariadb
```

The backups will be saved inside:

```
services/database/backups/
```

Only the **7 latest backups** are kept automatically.

---

## Backup PostgreSQL

Backup your Strapi/PostgreSQL database:

```bash
make backup-postgres
```

The backups will be saved inside:

```
services/datawarehouse/backups/
```

Same rotation: 7 backups kept.

---

## Full Backup

To backup **both databases** at once:

```bash
make backup
```

---

## Restore MariaDB

Restore the latest MariaDB backup:

```bash
make restore-mariadb
```

---

## Restore PostgreSQL

Restore the latest PostgreSQL backup:

```bash
make restore-postgres
```

---

## Cleaning Backups

To delete all backups manually:

```bash
make backup-clean
```

---

