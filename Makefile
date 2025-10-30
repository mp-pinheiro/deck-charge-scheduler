# Decky Charge Scheduler Plugin Makefile

# Load environment variables from .env file
ifneq (,$(wildcard .env))
include .env
export
endif

# Plugin configuration
PLUGIN_NAME = deck-charge-scheduler
DEPLOY_DIR = $(DECK_PLUGIN_DIR)

# Default connection settings (can be overridden via .env)
DECK_HOST ?= steamdeck
DECK_USER ?= deck
DECK_PORT ?= 22
DECK_PLUGIN_DIR ?= /home/deck/homebrew/plugins/$(PLUGIN_NAME)
DECK_SYSTEMD_DIR ?= /home/deck/.config/systemd/user

# Required files for deployment
REQUIRED_FILES = dist/index.js dist/index.js.map plugin.json main.py package.json charge-scheduler.sh charge-scheduler.conf

.PHONY: all build clean deploy install watch help

# Default target
all: build

# Build the plugin
build:
	@echo "Building plugin..."
	pnpm run build
	@echo "Build complete!"

# Install dependencies
install:
	@echo "Installing dependencies..."
	pnpm i
	@echo "Dependencies installed!"

# Build with file watching for development
watch:
	@echo "Starting watch mode..."
	pnpm run watch

# Deploy plugin to remote Steam Deck
deploy: build
	@echo "Deploying plugin to remote Steam Deck at $(DECK_USER)@$(DECK_HOST):$(DECK_PORT)..."
	@# SSH key authentication is set up and working
	@# Create backup if enabled
	@if [ "$(BACKUP_BEFORE_DEPLOY)" = "true" ]; then \
		echo "📦 Creating backup of existing plugin..."; \
		ssh -p $(DECK_PORT) $(DECK_USER)@$(DECK_HOST) "if [ -d '$(DECK_PLUGIN_DIR)' ]; then cp -r '$(DECK_PLUGIN_DIR)' '$(DECK_PLUGIN_DIR).backup.$(shell date +%Y%m%d_%H%M%S)'; echo 'Backup created'; else echo 'No existing plugin to backup'; fi"; \
	fi
	@# Remove existing plugin completely with sudo
	@echo "🗑️  Removing existing plugin directory..."
	sshpass -p '$(DECK_PASSWORD)' ssh -p $(DECK_PORT) $(DECK_USER)@$(DECK_HOST) "echo '$(DECK_PASSWORD)' | sudo -S rm -rf '$(DECK_PLUGIN_DIR)' 2>/dev/null || true"
	@# Create fresh remote deployment directory with sudo
	@echo "📁 Creating fresh remote plugin directory..."
	sshpass -p '$(DECK_PASSWORD)' ssh -p $(DECK_PORT) $(DECK_USER)@$(DECK_HOST) "echo '$(DECK_PASSWORD)' | sudo -S mkdir -p '$(DECK_PLUGIN_DIR)'"
	@# Create temp directory for file transfer
	@echo "📁 Creating temporary directory for file transfer..."
	ssh -p $(DECK_PORT) $(DECK_USER)@$(DECK_HOST) "mkdir -p /tmp/deploy-temp"
	@# Deploy files to temp directory using SCP
	@echo "📤 Copying plugin files to temporary directory..."
	scp -P $(DECK_PORT) -r dist $(DECK_USER)@$(DECK_HOST):/tmp/deploy-temp/
	scp -P $(DECK_PORT) plugin.json $(DECK_USER)@$(DECK_HOST):/tmp/deploy-temp/
	scp -P $(DECK_PORT) main.py $(DECK_USER)@$(DECK_HOST):/tmp/deploy-temp/
	scp -P $(DECK_PORT) package.json $(DECK_USER)@$(DECK_HOST):/tmp/deploy-temp/
	scp -P $(DECK_PORT) charge-scheduler.sh $(DECK_USER)@$(DECK_HOST):/tmp/deploy-temp/
	@# Move files from temp to plugin directory with sudo
	@echo "📦 Moving files to plugin directory with sudo..."
	sshpass -p '$(DECK_PASSWORD)' ssh -p $(DECK_PORT) $(DECK_USER)@$(DECK_HOST) "echo '$(DECK_PASSWORD)' | sudo -S cp -r /tmp/deploy-temp/* '$(DECK_PLUGIN_DIR)/'"
	@# Clean up temp directory
	@echo "🧹 Cleaning up temporary directory..."
	ssh -p $(DECK_PORT) $(DECK_USER)@$(DECK_HOST) "rm -rf /tmp/deploy-temp"
	@# Set executable permissions with sudo
	@echo "🔐 Setting executable permissions..."
	sshpass -p '$(DECK_PASSWORD)' ssh -p $(DECK_PORT) $(DECK_USER)@$(DECK_HOST) "echo '$(DECK_PASSWORD)' | sudo -S chmod +x '$(DECK_PLUGIN_DIR)/charge-scheduler.sh'"
	@# Create user data directories for SettingsManager
	@echo "📁 Creating user data directories..."
	ssh -p $(DECK_PORT) $(DECK_USER)@$(DECK_HOST) "mkdir -p ~/.local/share/homebrew/settings/$(PLUGIN_NAME) && mkdir -p ~/.local/share/homebrew/data/$(PLUGIN_NAME) && mkdir -p ~/.local/share/homebrew/logs/$(PLUGIN_NAME)"
	@echo "✅ Plugin deployed successfully to $(DECK_USER)@$(DECK_HOST):$(DECK_PLUGIN_DIR)"
	@echo "🔄 Restart Decky Loader to reload the plugin"
	@# Enable CEF debugging if configured
	@if [ "$(ENABLE_CEF_DEBUGGING)" = "true" ]; then \
		echo "🔧 CEF debugging enabled at http://$(DECK_HOST):$(CEF_DEBUG_PORT)"; \
		echo "💡 Use Chrome DevTools to connect to http://$(DECK_HOST):$(CEF_DEBUG_PORT)"; \
	fi

# Systemd timer no longer needed - using native Decky background tasks
deploy-systemd:
	@echo "⚠️ Systemd timer no longer required"
	@echo "The plugin now uses native Decky background tasks."
	@echo "Simply run 'make deploy' to install the plugin."

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	@echo "Clean complete!"

# Verify deployment structure
verify:
	@echo "Verifying remote deployment structure on $(DECK_USER)@$(DECK_HOST)..."
	@ssh -p $(DECK_PORT) $(DECK_USER)@$(DECK_HOST) "if [ -d '$(DECK_PLUGIN_DIR)' ]; then \
		echo '✓ Plugin directory exists: $(DECK_PLUGIN_DIR)'; \
		for file in $(REQUIRED_FILES); do \
			if [ -f '$(DECK_PLUGIN_DIR)/$$(basename $$file)' ] || [ -d '$(DECK_PLUGIN_DIR)/$$(basename $$file)' ]; then \
				echo \"✓ \$$file exists\"; \
			else \
				echo \"✗ Missing: \$$file\"; \
			fi; \
		done; \
	else \
		echo '✗ Plugin directory does not exist: $(DECK_PLUGIN_DIR)'; \
	fi"

# Remove deployed plugin
undeploy:
	@echo "Removing deployed plugin from remote Steam Deck..."
	@ssh -p $(DECK_PORT) $(DECK_USER)@$(DECK_HOST) "if [ -d '$(DECK_PLUGIN_DIR)' ]; then rm -rf '$(DECK_PLUGIN_DIR)' && echo '✅ Plugin removed from $(DECK_PLUGIN_DIR)'; else echo '⚠️ Plugin directory does not exist: $(DECK_PLUGIN_DIR)'; fi"

# Development workflow: install, build, deploy
dev: install build deploy

# Full setup - systemd no longer needed
full-setup: dev
	@echo "✅ Plugin setup complete!"
	@echo "The plugin uses native Decky background tasks - no systemd setup required."

# CEF debugging helper
debug-cef:
	@echo "Starting CEF debugging setup..."
	./scripts/debug-cef.sh setup

# Comprehensive deployment verification
verify-full:
	@echo "Running comprehensive deployment verification..."
	./scripts/verify-deployment.sh

# Show help
help:
	@echo "Available targets:"
	@echo "  build            - Build the plugin (pnpm run build)"
	@echo "  install          - Install dependencies (pnpm i)"
	@echo "  watch            - Build with file watching (pnpm run watch)"
	@echo "  deploy           - Build and deploy to remote Steam Deck"
	@echo "  deploy-systemd   - No longer needed (uses native Decky background tasks)"
	@echo "  clean            - Remove build artifacts"
	@echo "  verify           - Check remote deployment structure"
	@echo "  verify-full      - Comprehensive deployment verification"
	@echo "  debug-cef        - Set up CEF debugging for development"
	@echo "  undeploy         - Remove deployed plugin from remote Steam Deck"
	@echo "  dev              - Full development workflow (install + build + deploy)"
	@echo "  full-setup       - Complete plugin setup (systemd no longer required)"
	@echo "  help             - Show this help message"
	@echo ""
	@echo "Development scripts:"
	@echo "  ./scripts/debug-cef.sh     - CEF debugging helper"
	@echo "  ./scripts/verify-deployment.sh - Comprehensive verification"
	@echo ""
	@echo "Environment variables (configure in .env file):"
	@echo "  DECK_HOST        - Steam Deck hostname (default: steamdeck)"
	@echo "  DECK_USER        - SSH username (default: deck)"
	@echo "  DECK_PASSWORD    - SSH password (required if no SSH key)"
	@echo "  DECK_PORT        - SSH port (default: 22)"
	@echo "  ENABLE_CEF_DEBUGGING - Enable CEF debugging (default: true)"
	@echo "  CEF_DEBUG_PORT   - CEF debugging port (default: 8081)"
	@echo "  BACKUP_BEFORE_DEPLOY - Create backup before deployment (default: true)"