# Decky Charge Scheduler Plugin Makefile

# Plugin configuration
PLUGIN_NAME = deck-charge-scheduler
DEPLOY_DIR = /home/deck/homebrew/plugins/$(PLUGIN_NAME)

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

# Deploy plugin to Steam Deck
deploy: build
	@echo "Updating ownership of deployment directory..."
	sudo chown -R deck:deck $(DEPLOY_DIR) || true
	@echo "Deploying plugin to $(DEPLOY_DIR)..."
	@# Create deployment directory
	rm -rf $(DEPLOY_DIR)
	mkdir -p $(DEPLOY_DIR)
	@# Copy required files
	cp -r dist $(DEPLOY_DIR)/
	cp plugin.json $(DEPLOY_DIR)/
	cp main.py $(DEPLOY_DIR)/
	cp package.json $(DEPLOY_DIR)/
	cp charge-scheduler.sh $(DEPLOY_DIR)/
	cp charge-scheduler.conf $(DEPLOY_DIR)/
	@echo "Plugin deployed successfully to $(DEPLOY_DIR)"
	@echo "Restart Decky Loader to reload the plugin"

# Deploy systemd files (one-time setup)
deploy-systemd:
	@echo "Setting up systemd timer..."
	@# Create user service directory
	mkdir -p ~/.config/systemd/user
	@# Create service file using echo
	echo '[Unit]' > ~/.config/systemd/user/charge-scheduler.service
	echo 'Description=Steam Deck Charge Scheduler' >> ~/.config/systemd/user/charge-scheduler.service
	echo 'After=graphical-session.target' >> ~/.config/systemd/user/charge-scheduler.service
	echo '' >> ~/.config/systemd/user/charge-scheduler.service
	echo '[Service]' >> ~/.config/systemd/user/charge-scheduler.service
	echo 'Type=oneshot' >> ~/.config/systemd/user/charge-scheduler.service
	echo 'ExecStart=$(DEPLOY_DIR)/charge-scheduler.sh schedule' >> ~/.config/systemd/user/charge-scheduler.service
	echo 'StandardOutput=null' >> ~/.config/systemd/user/charge-scheduler.service
	echo 'StandardError=journal' >> ~/.config/systemd/user/charge-scheduler.service
	echo '' >> ~/.config/systemd/user/charge-scheduler.service
	echo '[Install]' >> ~/.config/systemd/user/charge-scheduler.service
	echo 'WantedBy=timer.target' >> ~/.config/systemd/user/charge-scheduler.service
	@# Create timer file using echo
	echo '[Unit]' > ~/.config/systemd/user/charge-scheduler.timer
	echo 'Description=Run charge scheduler every 5 minutes' >> ~/.config/systemd/user/charge-scheduler.timer
	echo 'Requires=charge-scheduler.service' >> ~/.config/systemd/user/charge-scheduler.timer
	echo '' >> ~/.config/systemd/user/charge-scheduler.timer
	echo '[Timer]' >> ~/.config/systemd/user/charge-scheduler.timer
	echo 'OnCalendar=*:0/5' >> ~/.config/systemd/user/charge-scheduler.timer
	echo 'Persistent=true' >> ~/.config/systemd/user/charge-scheduler.timer
	echo '' >> ~/.config/systemd/user/charge-scheduler.timer
	echo '[Install]' >> ~/.config/systemd/user/charge-scheduler.timer
	echo 'WantedBy=timers.target' >> ~/.config/systemd/user/charge-scheduler.timer
	@# Enable and start timer
	systemctl --user daemon-reload
	systemctl --user enable charge-scheduler.timer
	systemctl --user start charge-scheduler.timer
	@echo "Systemd timer setup complete!"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	@echo "Clean complete!"

# Verify deployment structure
verify:
	@echo "Verifying deployment structure..."
	@if [ -d "$(DEPLOY_DIR)" ]; then \
		echo "✓ Plugin directory exists: $(DEPLOY_DIR)"; \
		for file in $(REQUIRED_FILES); do \
			if [ -f "$(DEPLOY_DIR)/$$(basename $$file)" ] || [ -d "$(DEPLOY_DIR)/$$(basename $$file)" ]; then \
				echo "✓ $$file exists"; \
			else \
				echo "✗ Missing: $$file"; \
			fi; \
		done; \
	else \
		echo "✗ Plugin directory does not exist: $(DEPLOY_DIR)"; \
	fi

# Remove deployed plugin
undeploy:
	@echo "Removing deployed plugin..."
	rm -rf $(DEPLOY_DIR)
	@echo "Plugin removed from $(DEPLOY_DIR)"

# Development workflow: install, build, deploy
dev: install build deploy

# Full setup including systemd
full-setup: dev deploy-systemd

# Show help
help:
	@echo "Available targets:"
	@echo "  build            - Build the plugin (pnpm run build)"
	@echo "  install          - Install dependencies (pnpm i)"
	@echo "  watch            - Build with file watching (pnpm run watch)"
	@echo "  deploy           - Build and deploy to Steam Deck"
	@echo "  deploy-systemd   - Set up systemd timer (one-time setup)"
	@echo "  clean            - Remove build artifacts"
	@echo "  verify           - Check deployment structure"
	@echo "  undeploy         - Remove deployed plugin"
	@echo "  dev              - Full development workflow (install + build + deploy)"
	@echo "  full-setup       - Complete setup including systemd"
	@echo "  help             - Show this help message"