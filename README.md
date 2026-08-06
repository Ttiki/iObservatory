# iObservatory Boilerplate Stack

This is a Docker-based boilerplate stack for building a **data-driven Impact Observatory platform**, combining open-source tools like MediaWiki, Strapi, Apache Hop, PostgreSQL, and MinIO. The architecture is designed to be modular, extensible, and privacy-conscious.

> ⚠️ This repository is a **starting point**, not a plug-and-play solution. Some configuration and initialization steps are required before use.

## 🏗️ Project Architecture

```
📁 mediawiki/
├── 🐳 docker-compose.yml          # Service orchestration
├── 📋 makefile                    # Task automation
├── 🔧 .env                        # Global environment variables
├── 🚫 .gitignore                  # Version control exclusions
└── 📂 services/
    ├── 🌐 mediawiki/              # Semantic Wiki Service
    │   ├── 🐳 MediaWiki.Dockerfile
    │   ├── ⚙️ LocalSettings.php
    │   ├── 🔧 .env
    │   ├── 📦 composer.local.json
    │   ├── 📋 extensions.config
    │   └── 🔌 extensions/         # Semantic extensions
    ├── 🗄️ mariadb/                # Database layer
    │   └── 🔧 .env
    └── 🏭 hop-web/                # ETL Processing
        ├── 🔧 .env
        ├── 📁 projects/            # CSV data and source files
        ├── 📁 pipelines/           # Hop transformation pipelines
        └── 🐱 tomcat/config/
```

---

## 🧩 Components

### 🌐 MediaWiki (Port 8080)
**Semantic Wiki Platform for Ontology Development**

- **Version:** Compatible REL1_43
- **Purpose:** Create, manage and populate ontologies
- **Key Semantic Extensions:**
  - **Cargo:** Store and query structured data in wiki pages
  - **PageForms:** Create forms for structured data entry
  - **PageSchemas:** Define data schemas and templates
  - **VisualEditor:** WYSIWYG editing for better user experience
  - **Arrays, Variables:** Advanced template programming

### 🗄️ MariaDB (Port 3306 - internal)
**Relational Database Backend**

- **Version:** 11.4 (LTS)
- **Purpose:** Store wiki content, semantic data, and ontology relationships
- **Configuration:** Optimized for MediaWiki with full UTF-8 support

### 🏭 Apache Hop Web (Port 8081)
**ETL Platform for Data Integration**

- **Version:** Latest
- **Purpose:** Extract, Transform, and Load data into the semantic wiki
- **Data Storage:**
  - **`/projects`:** CSV files and source data for processing
  - **`/pipelines`:** Hop transformation pipelines and workflows
- **Use Cases:**
  - Transform CSV files into wiki-compatible formats
  - Connect to external databases and APIs
  - Clean and normalize data before ontology population
  - Create automated data pipelines

---

## 📦 Configuration


### 🌐 Network Configuration
- **Required Ports:**
  - `8080`: MediaWiki (semantic wiki interface)
  - `8081`: Apache Hop Web (ETL interface)
  - `3306`: MariaDB (internal only)

---

## 🚀 Deployment Instructions

### Platform Deployment
```bash
# Run the automated deployment
make update
```

**This command will:**
- ✅ Generate secure passwords for all services
- ✅ Configure all environment files
- ✅ Download MediaWiki semantic extensions
- ✅ Build and start all containers
- ✅ Create `connection-info.txt` with access details

### 4️⃣ Deployment Verification
```bash
# Check all containers are running
docker ps

# Check logs for any issues
make logs

# Test service accessibility
curl -I http://[YOUR_IP]:8080
curl -I http://[YOUR_IP]:8081
```
---

## 🔧 Configuration

### 📄 Key Configuration Files

#### 🌐 `.env` (Root)
```env
HOSTNAME=[YOUR_SERVER_IP]
SITE_NAME=semantic-web
```

#### 🗄️ `services/mediawiki/.env`
```env
MEDIAWIKI_ADMIN_USER=admin
MEDIAWIKI_ADMIN_PWD=[AUTO_GENERATED]
MEDIAWIKI_SECRET_KEY=[AUTO_GENERATED]
MEDIAWIKI_UPGRADE_KEY=[AUTO_GENERATED]
MARIADB_DATABASE=semantic_web_db
MARIADB_USER=root
MARIADB_ROOT_PASSWORD=[AUTO_GENERATED]
```

### 🔐 Access Information

After installation, check the `connection-info.txt` file:
```bash
cat connection-info.txt
```

**Sample content:**
```
## MediaWiki Access
URL: http://[SERVER_IP]/mediawiki
Admin User: admin
Admin Password: [20_SECURE_CHARACTERS]

## Apache Hop Web Access
URL: http://[SERVER_IP]:8081
Username: admin
Password: [20_SECURE_CHARACTERS]

## Database Information
Database Name: semantic_web_db
Database User: root
Database Password: [20_SECURE_CHARACTERS]
```

---

## 💡 Usage

### 🌐 Accessing MediaWiki
1. **URL:** `http://[YOUR_IP]:8080/`
2. **Login:** Use credentials from `connection-info.txt`
3. **First Steps:**
   - Create your first semantic page
   - Define templates for your ontology
   - Set up forms for data entry
   - Configure namespaces for different data types

### 🏭 Accessing Apache Hop
1. **URL:** `http://[YOUR_IP]:8081`
2. **Login:** Username `admin` + generated password
3. **First Steps:**
   - Explore the interface
   - Create your first data transformation pipeline
   - Configure data source connections
   - Test data transformations

### 📁 Apache Hop Directory Structure
- **`services/hop-web/projects/`** - Place your CSV files and source data here
- **`services/hop-web/pipelines/`** - Store your Hop transformation pipelines (.hpl) and workflows (.hwf)
  - Transformations are saved automatically in this directory
  - Accessible as `/opt/hop/pipelines` inside the container
  - Includes subdirectories for organizing different projects
