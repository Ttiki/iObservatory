# ==============================================================================
# iObservatory - Makefile
# ==============================================================================
#
# Generic deployment template for an iObservatory platform.
#
# The Makefile provides commands for:
#
#   • First-time installation
#   • Environment initialisation
#   • Credential generation
#   • MediaWiki extension management
#   • Composer dependency management
#   • Docker lifecycle management
#   • MediaWiki maintenance
#   • Database backups
#
# Run:
#
#   make help
#
# to display all available commands.
#
# ==============================================================================


# ==============================================================================
# CONFIGURATION
# ==============================================================================

SHELL := /bin/bash

DC := docker compose

MEDIAWIKI_SERVICE := mediawiki

DEFAULT_EXT_VERSION := REL1_42


# ==============================================================================
# TERMINAL COLORS
# ==============================================================================

RESET   := \033[0m
BOLD    := \033[1m

RED     := \033[31m
GREEN   := \033[32m
YELLOW  := \033[33m
BLUE    := \033[34m
MAGENTA := \033[35m
CYAN    := \033[36m
WHITE   := \033[37m


# ==============================================================================
# UI HELPERS
# ==============================================================================

define header
	@printf "\n$(BOLD)$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)\n"
	@printf "$(BOLD)$(CYAN)  %s$(RESET)\n" "$(1)"
	@printf "$(BOLD)$(CYAN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)\n"
endef

define success
	@printf "  $(GREEN)✔$(RESET) %s\n" "$(1)"
endef

define warning
	@printf "  $(YELLOW)⚠$(RESET) %s\n" "$(1)"
endef

define info
	@printf "  $(BLUE)➜$(RESET) %s\n" "$(1)"
endef

define failure
	@printf "  $(RED)✖$(RESET) %s\n" "$(1)"
endef


# ==============================================================================
# DEFAULT TARGET
# ==============================================================================

.DEFAULT_GOAL := help


# ==============================================================================
# HELP
# ==============================================================================

.PHONY: help

help: ## Show available commands
	@printf "\n"
	@printf "$(BOLD)$(CYAN)"
	@printf "██\  ██████\  ██\                                                         ██\                                    \n"
	@printf "\__|██  __██\ ██ |                                                        ██ |                                   \n"
	@printf "██\ ██ /  ██ |███████\   ███████\  ██████\   ██████\ ██\    ██\ ██████\ ██████\    ██████\   ██████\  ██\   ██\  \n"
	@printf "██ |██ |  ██ |██  __██\ ██  _____|██  __██\ ██  __██\\██\    ██  |\____██\\_██  _|  ██  __██\ ██  __██\ ██ |  ██ | \n"
	@printf "██ |██ |  ██ |██ |  ██ |\██████\  ████████ |██ |  \__|\██\██  / ███████ | ██ |    ██ /  ██ |██ |  \__|██ |  ██ | \n"
	@printf "██ |██ |  ██ |██ |  ██ | \____██\ ██   ____|██ |       \███  / ██  __██ | ██ |██\ ██ |  ██ |██ |      ██ |  ██ | \n"
	@printf "██ | ██████  |███████  |███████  |\███████\ ██ |        \█  /  \███████ | \████  |\██████  |██ |      \███████ | \n"
	@printf "\__| \______/ \_______/ \_______/  \_______|\__|         \_/    \_______|  \____/  \______/ \__|       \_______| \n"
	@printf "                                                                                                      ██\   ██ | \n"
	@printf "                                                                                                       \██████ | \n"
	@printf "                                                                                                        \______/ \n"
	@printf "$(RESET)\n"

	@printf "$(BOLD)$(WHITE)Generic Observatory Platform$(RESET)\n\n"

	@printf "$(BOLD)$(MAGENTA)First-time installation$(RESET)\n"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| grep -E 'install|init-env|credentials' \
		| awk 'BEGIN {FS = ":.*?## "}; \
		       {printf "  $(CYAN)%-24s$(RESET) %s\n", $$1, $$2}'

	@printf "\n$(BOLD)$(MAGENTA)Docker$(RESET)\n"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| grep -E 'build|rebuild|up|down|restart|logs|status|pull' \
		| awk 'BEGIN {FS = ":.*?## "}; \
		       {printf "  $(CYAN)%-24s$(RESET) %s\n", $$1, $$2}'

	@printf "\n$(BOLD)$(MAGENTA)MediaWiki$(RESET)\n"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| grep -E 'mediawiki|extensions|composer' \
		| awk 'BEGIN {FS = ":.*?## "}; \
		       {printf "  $(CYAN)%-24s$(RESET) %s\n", $$1, $$2}'

	@printf "\n$(BOLD)$(MAGENTA)Maintenance$(RESET)\n"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| grep -E 'update|backup|connection|shell|clean' \
		| awk 'BEGIN {FS = ":.*?## "}; \
		       {printf "  $(CYAN)%-24s$(RESET) %s\n", $$1, $$2}'

	@printf "\n"


# ==============================================================================
# FIRST-TIME INSTALLATION
# ==============================================================================

.PHONY: install

install: ## 🚀 Install the platform for the first time
	$(call header,🚀  FIRST-TIME INSTALLATION)

	$(call info,Initialising environment files...)
	@$(MAKE) --no-print-directory init-env

	$(call info,Generating secure credentials...)
	@$(MAKE) --no-print-directory credentials

	$(call info,Installing MediaWiki extensions...)
	@$(MAKE) --no-print-directory extensions

	$(call info,Building containers...)
	@$(MAKE) --no-print-directory build

	$(call info,Starting services...)
	@$(MAKE) --no-print-directory up

	$(call info,Waiting for services...)
	@$(MAKE) --no-print-directory wait

	$(call info,Installing MediaWiki...)
	@$(MAKE) --no-print-directory mediawiki-install

	$(call info,Generating connection information...)
	@$(MAKE) --no-print-directory connection-info

	@printf "\n"
	@printf "$(BOLD)$(GREEN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)\n"
	@printf "$(BOLD)$(GREEN)  🎉 Installation completed successfully!$(RESET)\n"
	@printf "$(BOLD)$(GREEN)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)\n\n"


# ==============================================================================
# ENVIRONMENT
# ==============================================================================

.PHONY: init-env

init-env: ## ⚙️ Create missing .env files from .env.example files
	@find . -type f -name ".env.example" -print0 | while IFS= read -r -d '' example; do \
		env="$${example%.example}"; \
		if [ -f "$$env" ]; then \
			printf "  $(YELLOW)•$(RESET) %s already exists\n" "$$env"; \
		else \
			cp "$$example" "$$env"; \
			printf "  $(GREEN)✔$(RESET) Created %s\n" "$$env"; \
		fi; \
	done


# ==============================================================================
# CREDENTIALS
# ==============================================================================

.PHONY: credentials

credentials: ## 🔐 Generate secure passwords and keys
	@printf "  $(BLUE)🔐 Generating secure credentials...$(RESET)\n"

	@NEW_ADMIN_PWD=$$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-20); \
	NEW_HOP_PWD=$$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-20); \
	NEW_SECRET_KEY=$$(openssl rand -hex 32); \
	NEW_UPGRADE_KEY=$$(openssl rand -base64 12 | tr -d '=+/'); \
	\
	sed -i "s/^MEDIAWIKI_ADMIN_PWD=.*/MEDIAWIKI_ADMIN_PWD=$$NEW_ADMIN_PWD/" \
		services/mediawiki/.env; \
	\
	sed -i "s/^MEDIAWIKI_SECRET_KEY=.*/MEDIAWIKI_SECRET_KEY=$$NEW_SECRET_KEY/" \
		services/mediawiki/.env; \
	\
	sed -i "s/^MEDIAWIKI_UPGRADE_KEY=.*/MEDIAWIKI_UPGRADE_KEY=$$NEW_UPGRADE_KEY/" \
		services/mediawiki/.env; \
	\
	sed -i 's/password="[^"]*"/password="'"$$NEW_HOP_PWD"'"/' \
		services/hop-web/tomcat/config/tomcat-users.xml

	$(call success,Credentials generated)


# ==============================================================================
# MEDIAWIKI EXTENSIONS
# ==============================================================================

.PHONY: extensions

extensions: ## 📦 Install configured MediaWiki extensions
	@printf "  $(BLUE)📦 Synchronising MediaWiki extensions...$(RESET)\n"

	@mkdir -p services/mediawiki/extensions

	@if [ -f services/mediawiki/extensions.config ]; then \
		while read -r line; do \
			[ -z "$$line" ] && continue; \
			case "$$line" in \#*) continue ;; esac; \
			ext=$$(echo "$$line" | awk '{print $$1}'); \
			printf "     $(CYAN)%-30s$(RESET)" "$$ext"; \
			if [ -d "services/mediawiki/extensions/$$ext/.git" ]; then \
				printf "$(GREEN)already installed$(RESET)\n"; \
			else \
				if git clone --depth 1 \
					--branch $(DEFAULT_EXT_VERSION) \
					"https://gerrit.wikimedia.org/r/mediawiki/extensions/$$ext" \
					"services/mediawiki/extensions/$$ext" \
					> /dev/null 2>&1; then \
					printf "$(GREEN)✔ installed$(RESET)\n"; \
				else \
					printf "$(RED)✖ failed$(RESET)\n"; \
				fi; \
			fi; \
		done < services/mediawiki/extensions.config; \
	fi

	$(call success,Extensions ready)


# ==============================================================================
# COMPOSER
# ==============================================================================

.PHONY: composer

composer: ## 📦 Update Composer dependencies
	@printf "  $(BLUE)📦 Updating Composer dependencies...$(RESET)\n"
	@$(DC) exec $(MEDIAWIKI_SERVICE) \
		composer update \
		--no-dev \
		--prefer-dist \
		--optimize-autoloader \
		--no-scripts
	$(call success,Composer dependencies updated)


.PHONY: composer-install

composer-install: ## 📦 Install Composer dependencies from lock file
	@printf "  $(BLUE)📦 Installing Composer dependencies...$(RESET)\n"
	@$(DC) exec $(MEDIAWIKI_SERVICE) \
		composer install \
		--no-dev \
		--prefer-dist \
		--optimize-autoloader \
		--no-scripts
	$(call success,Composer dependencies installed)


# ==============================================================================
# DOCKER
# ==============================================================================

.PHONY: build

build: ## 🔨 Build Docker images
	@printf "  $(BLUE)🔨 Building Docker images...$(RESET)\n"
	@$(DC) build
	$(call success,Docker build complete)


.PHONY: rebuild

rebuild: ## 🔨 Rebuild Docker images without cache
	@printf "  $(BLUE)🔨 Rebuilding Docker images without cache...$(RESET)\n"
	@$(DC) build --no-cache
	$(call success,Docker rebuild complete)


.PHONY: up

up: ## 🚀 Start all containers
	@printf "  $(BLUE)🚀 Starting containers...$(RESET)\n"
	@$(DC) up -d
	$(call success,All containers started)


.PHONY: down

down: ## 🛑 Stop all containers
	@printf "  $(YELLOW)🛑 Stopping containers...$(RESET)\n"
	@$(DC) down
	$(call success,All containers stopped)


.PHONY: restart

restart: ## 🔄 Restart all containers
	@printf "  $(CYAN)🔄 Restarting containers...$(RESET)\n"
	@$(DC) restart
	$(call success,All containers restarted)


.PHONY: logs

logs: ## 📜 Follow container logs
	@printf "$(BOLD)$(CYAN)📜 Container logs$(RESET)\n\n"
	@$(DC) logs -f --tail=100


.PHONY: status

status: ## 📊 Show container status
	@printf "$(BOLD)$(CYAN)📊 Container status$(RESET)\n\n"
	@$(DC) ps


.PHONY: pull

pull: ## ⬇️ Pull latest Docker images
	@printf "  $(BLUE)⬇️  Pulling Docker images...$(RESET)\n"
	@$(DC) pull
	$(call success,Docker images pulled)


# ==============================================================================
# MEDIAWIKI
# ==============================================================================

.PHONY: mediawiki-install

mediawiki-install: ## 🧱 Install MediaWiki and initialise its database
	@printf "  $(BLUE)🧱 Installing MediaWiki...$(RESET)\n"

	@$(DC) exec $(MEDIAWIKI_SERVICE) \
		php maintenance/run.php install \
		--dbtype=mysql \
		--dbserver=mariadb \
		--dbname=$$MARIADB_DATABASE \
		--dbuser=$$MARIADB_USER \
		--dbpass=$$MARIADB_ROOT_PASSWORD \
		--server="http://$$HOSTNAME" \
		--scriptpath="" \
		--lang=en \
		--pass=$$MEDIAWIKI_ADMIN_PWD \
		"$$OBSERVATORY_NAME" \
		"$$MEDIAWIKI_ADMIN_USER"

	@$(MAKE) --no-print-directory composer-install

	@$(DC) exec $(MEDIAWIKI_SERVICE) \
		php maintenance/run.php update --quick

	$(call success,MediaWiki installed)


.PHONY: mediawiki-update

mediawiki-update: ## 🔄 Update MediaWiki database schema
	@printf "  $(BLUE)🔄 Updating MediaWiki database...$(RESET)\n"
	@$(DC) exec $(MEDIAWIKI_SERVICE) \
		php maintenance/run.php update --quick
	$(call success,MediaWiki database updated)


# ==============================================================================
# MAINTENANCE
# ==============================================================================

.PHONY: update

update: ## 🔄 Perform a complete platform maintenance update
	$(call header,🔄  PLATFORM UPDATE)

	$(call info,Pulling latest Docker images...)
	@$(MAKE) --no-print-directory pull

	$(call info,Synchronising extensions...)
	@$(MAKE) --no-print-directory extensions

	$(call info,Rebuilding containers...)
	@$(MAKE) --no-print-directory build

	$(call info,Starting services...)
	@$(MAKE) --no-print-directory up

	$(call info,Updating Composer dependencies...)
	@$(MAKE) --no-print-directory composer

	$(call info,Updating MediaWiki...)
	@$(MAKE) --no-print-directory mediawiki-update

	@printf "\n$(BOLD)$(GREEN)✔ Platform update complete$(RESET)\n\n"


# ==============================================================================
# DATABASE
# ==============================================================================

.PHONY: backup-mariadb

backup-mariadb: ## 💾 Create a MariaDB database backup
	@mkdir -p services/mariadb/backups
	@printf "  $(BLUE)💾 Creating MariaDB backup...$(RESET)\n"
	@$(DC) exec mariadb sh -c \
		'mysqldump -u"$$MARIADB_USER" -p"$$MARIADB_PASSWORD" "$$MARIADB_DATABASE"' \
		> services/mariadb/backups/backup_$$(date +%F_%H-%M-%S).sql
	$(call success,Database backup created)


# ==============================================================================
# DEVELOPMENT / DEBUGGING
# ==============================================================================

.PHONY: shell

shell: ## 🐚 Open a shell inside the MediaWiki container
	@$(DC) exec $(MEDIAWIKI_SERVICE) bash


.PHONY: wait

wait: ## ⏳ Wait for services to start
	@printf "  $(CYAN)⏳ Waiting for services"
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		printf "."; \
		sleep 1; \
	done
	@printf " $(GREEN)✔$(RESET)\n"


.PHONY: clean

clean: ## 🧹 Stop containers and remove orphaned resources
	@printf "  $(YELLOW)🧹 Cleaning Docker resources...$(RESET)\n"
	@$(DC) down --remove-orphans
	$(call success,Cleanup complete)
