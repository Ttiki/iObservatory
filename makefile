# Load environment variables
include .env
include ./services/mediawiki/.env

DC = docker compose
DEFAULT_EXT_VERSION = REL1_39

.DEFAULT_GOAL := help

help: ## Show help
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ───── Docker Lifecycle ─────

up: ## Start all containers
	$(DC) up -d

down: ## Stop all containers
	$(DC) down

restart: ## Restart all containers
	$(DC) down && $(DC) up -d

logs: ## Show container logs
	$(DC) logs -f --tail=100

clean: ## Remove local build & backup artifacts
	rm -rf mediawiki_container_folder services/**/backups
	rm -rf services/mediawiki/extensions && mkdir -p services/mediawiki/extensions
	docker system prune -a --force

build: mw-extensions ## Build full stack, install MediaWiki extensions, and start everything
	$(DC) build
	make mw-initialize

# ───── MediaWiki ─────

mw-extensions: ## Clone MediaWiki extensions
	rm -rf services/mediawiki/extensions && mkdir -p services/mediawiki/extensions
	@cat services/mediawiki/extensions.config | while read line; do \
		ext=$$(echo $$line | awk '{print $$1}'); \
		ver=$$(echo $$line | awk '{print $$2}'); \
		if [ -z "$$ver" ]; then ver=$(DEFAULT_EXT_VERSION); fi; \
		echo "🔹 Cloning \033[1m$$ext\033[0m @ \033[36m$$ver\033[0m"; \
		if git clone --depth 1 --branch "$$ver" https://gerrit.wikimedia.org/r/mediawiki/extensions/$$ext services/mediawiki/extensions/$$ext > /dev/null 2>&1; then \
			echo "   ✅ \033[32mSuccessfully cloned:\033[0m $$ext"; \
		else \
			echo "   ❌ \033[31mFailed to clone:\033[0m $$ext (check branch or extension name)"; \
		fi; \
	done
	@echo "🔧 Cloning non-Gerrit extensions..."
	@git clone https://github.com/StarCitizenTools/mediawiki-extensions-TabberNeue.git services/mediawiki/extensions/TabberNeue && echo "   ✅ TabberNeue added"
	@git clone https://gitlab.com/organicdesign/TreeAndMenu.git services/mediawiki/extensions/TreeAndMenu && echo "   ✅ TreeAndMenu added"
	@git clone https://github.com/neayi/mw-echarts.git services/mediawiki/extensions/ECharts && echo "   ✅ ECharts added"
	@if [ -d "services/mediawiki/extensions/VisualEditor" ]; then \
    cd services/mediawiki/extensions/VisualEditor && \
    echo "   ⚙️  Resetting VisualEditor submodules..." && \
    git submodule deinit -f lib/ve || true && \
    git submodule update --init --recursive lib/ve && \
    echo "   🔄 VisualEditor submodules updated"; \
  fi

mw-install: ## Install composer and update mediawiki (running maintenance script)
	$(DC) up -d
	sleep 10
	$(DC) exec mediawiki composer install
	$(DC) exec mediawiki php maintenance/update.php

mw-initialize: ## First-time Composer install with no scripts (safe for fresh builds)
	$(DC) up -d
	sleep 10
	@echo "📦 Composer update (no-scripts)..."
	$(DC) exec mediawiki composer update --no-dev --prefer-dist --optimize-autoloader --no-scripts
	@echo "⚙️ Running post-install/update scripts manually (if any)..."
	$(DC) exec mediawiki composer run-script post-update-cmd || true
	@echo "🧹 Running MediaWiki update.php..."
	$(DC) exec mediawiki php maintenance/update.php

mw-dev-copy: ## Copy MediaWiki container contents locally (for dev)
	rm -rf mediawiki_container_folder
	$(DC) cp mediawiki:/var/www/html/. mediawiki_container_folder/

# ───── Database Backups ─────

backup: ## Backup all databases
	make backup-mariadb
	make backup-postgres

backup-mariadb:
	mkdir -p services/mariadb/backups
	$(DC) exec database sh -c "mysqldump -u$$MARIADB_USER -p$$MARIADB_PWD $$MEDIAWIKI_DB_NAME" > services/mariadb/backups/backup_$(shell date +%F_%T).sql

backup-postgres:
	mkdir -p services/postgres/backups
	$(DC) exec datawarehouse pg_dump -U $$DATABASE_USERNAME $$DATABASE_NAME > services/postgres/backups/backup_$(shell date +%F_%T).sql
