# 🧩 Components

## 🌐 MediaWiki

**Semantic knowledge management and ontology platform**

MediaWiki provides the main knowledge-management interface of the platform.

It can be used to:

* Create and manage structured knowledge
* Develop and populate ontologies
* Define templates and schemas
* Collect structured information
* Provide a human-facing interface for knowledge management
* Expose structured information to other components

### Semantic extensions

The default configuration can include extensions such as:

* **Cargo** — Store and query structured data
* **PageForms** — Provide forms for structured data entry
* **PageSchemas** — Define schemas for pages and forms
* **VisualEditor** — WYSIWYG editing
* **Arrays** — Array manipulation in templates
* **Variables** — Advanced template programming

Additional MediaWiki extensions can be configured through:

```text
services/mediawiki/extensions.config
```

---

## 🗄️ MariaDB

**MediaWiki relational database**

MariaDB is used as the primary database backend for MediaWiki.

It stores:

* Wiki content
* User information
* MediaWiki configuration data
* Structured data managed by MediaWiki extensions

The database is normally exposed only inside the Docker network.

---

## 🐘 PostgreSQL

**Relational data warehouse**

PostgreSQL provides the `analytics_dw` database for Observatory data and
analytics workloads. It is also used by Apache Hop and Cube.

Keeping PostgreSQL separate from MediaWiki's MariaDB database allows the
platform to maintain distinct data domains and services.

---

## 🏭 Apache Hop

**Data integration and ETL**

Apache Hop Server and Hop Web provide the data integration layer of the
platform. They can import, clean, transform, normalise, and prepare external
datasets for other platform components.

### Directory structure

```text
services/etl/
├── hop-server/
│   ├── projects/
│   └── tomcat/config/
└── hop-web/
    ├── projects/
    └── tomcat/config/
```

These directories are mounted into the corresponding Apache Hop containers.
Both services connect to PostgreSQL.

---

## 📊 Cube

**Semantic data and SQL API**

Cube provides a semantic layer over the PostgreSQL data warehouse. Cube models
are loaded from:

```text
model/
```

The Cube Playground is available on port `4000` and the SQL API on port `15432`
when the ports are published by Docker. It is also configured for the `/cube/`
reverse-proxy path.

---

## 🛠️ Administration tools

### phpMyAdmin

phpMyAdmin provides browser-based administration for the MediaWiki MariaDB
database at the `/pma/` reverse-proxy path.

### pgAdmin

pgAdmin provides browser-based administration for the PostgreSQL database at
the `/pga/` reverse-proxy path. The default server connection is defined in:

```text
services/pga/servers.json
```
