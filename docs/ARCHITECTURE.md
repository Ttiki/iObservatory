## 🏗️ Architecture

```text
iObservatory/
│
├── 🐳 docker-compose.yml
├── 📋 makefile
├── 🔧 .env.example
├── 🚫 .gitignore
├── 📊 model/
│
└── services/
    ├── 🌐 mediawiki/
    ├── 🗄️ mariadb/
    ├── 🐘 postgres/
    ├── 🏭 etl/
    │   ├── 🧰 hop-server/
    │   │   ├── 🔧 .env.example
    │   │   ├── 📁 projects/
    │   │   └── 🐱 tomcat/config/
    │   └── 🧰 hop-web/
    │       ├── 🔧 .env.example
    │       ├── 📁 projects/
    │       └── 🐱 tomcat/config/
    ├── 📊 cube/
    │   └── 🔧 .env.example
    ├── 🛠️ pma/
    │   └── 🔧 .env.example
    └── 🛠️ pga/
        ├── 🔧 .env.example
        └── 🗃️ servers.json
```

The Compose stack also includes nginx-proxy and its ACME companion for HTTP
routing and optional Let's Encrypt certificates. MariaDB and PostgreSQL are
internal databases; the browser-facing services are routed by path under the
configured domain.

The exact set of services may evolve with the template. The architecture is
intentionally modular so that additional components can be introduced without
changing the overall deployment workflow.
