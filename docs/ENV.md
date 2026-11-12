# Environment Configuration

Each service can have its own `.env` file under:

```text
services/<service>/.env
```

Do **not** commit actual `.env` files — use the `.env.example` templates
provided.

## Global `.env`

| Variable | Description |
|---|---|
| `DOMAIN_NAME` | Base domain used by the reverse proxy |
| `LETSENCRYPT_EMAIL` | Email used for Let's Encrypt certificates |
| `OBSERVATORY_NAME` | Name shown in MediaWiki |

## Service environments

* MediaWiki uses database and administrator credentials in
  `services/mediawiki/.env`.
* MariaDB uses `services/mariadb/.env`.
* PostgreSQL uses `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` in
  `services/postgres/.env`.
* Apache Hop uses `services/etl/hop-server/.env` and
  `services/etl/hop-web/.env`.
* Cube uses `services/cube/.env`.
* phpMyAdmin and pgAdmin use `services/pma/.env` and `services/pga/.env`.

Run `make init-env` to create missing files from the tracked templates. Run
`make credentials` to generate missing passwords and secrets. Existing `.env`
files are not overwritten.

See `services/<service>/.env.example` for the full reference.
