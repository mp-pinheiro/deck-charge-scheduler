# Smart Charge Scheduler - Remote Development Guide

## Project Overview

This is a **Decky plugin** for Steam Deck that provides intelligent battery charge scheduling to prolong battery health. The plugin uses a **hybrid architecture** combining React frontend, Python backend, and bash script core for reliable SteamOS integration.

### Architecture

```
Remote Development PC → SSH/SCP → Steam Deck
├── React/TypeScript Frontend (src/index.tsx)
├── Python Backend (main.py)
├── Bash Script Core (charge-scheduler.sh)
└── Configuration (charge-scheduler.conf)
```

### Key Features

- **Real-time Status Display**: Current charge limits and schedule information
- **Schedule Management**: Time-based charge control with GUI configuration
- **Multiple Operating Modes**: Schedule, Always Full, Always Limit
- **CEF Debugging**: Remote debugging via Chrome DevTools
- **Systemd Integration**: Background timer operation

## Remote Development Setup

### Prerequisites

1. **Steam Deck** with Decky Loader installed
2. **SSH Access** to Steam Deck (enable in SteamOS settings)
3. **Network Connectivity** between development PC and Steam Deck
4. **Node.js/pnpm** for frontend development
5. **Chrome/Chromium** for CEF debugging

### Environment Configuration

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your connection settings in `.env`:**
   ```bash
   # Steam Deck Connection
   DECK_HOST=steamdeck
   DECK_USER=deck
   DECK_PASSWORD=your_deck_password_here
   DECK_PORT=22

   # CEF Debugging
   ENABLE_CEF_DEBUGGING=true
   CEF_DEBUG_PORT=8081
   ```

### SSH Authentication

Two authentication methods are supported:

#### Method 1: Password Authentication (Simple)
- Set `DECK_PASSWORD` in `.env` file
- **Note**: Less secure, for development only

#### Method 2: SSH Key Authentication (Recommended)
1. **Generate SSH key on development PC:**
   ```bash
   ssh-keygen -t ed25519 -C "deck-dev"
   ```

2. **Copy public key to Steam Deck:**
   ```bash
   ssh-copy-id deck@steamdeck
   ```

3. **Configure key path in `.env`:**
   ```bash
   SSH_KEY_PATH=~/.ssh/id_ed25519
   ```

## Development Workflow

### Commands

```bash
# Install dependencies
make install

# Development with hot reload
make watch

# Deploy to remote Steam Deck
make deploy

# Verify deployment
make verify

# Setup systemd timer (one-time)
make deploy-systemd

# Complete setup
make full-setup

# Remove plugin
make undeploy

# Show help
make help
```

### Live Debugging with Playwright MCP

This is the **standard debugging process** for live interaction and testing of the Decky plugin.

#### Prerequisites
- CEF debugging enabled in `.env`: `ENABLE_CEF_DEBUGGING=true`
- Plugin deployed: `make deploy`
- Playwright MCP tool available

#### Debugging Process
Use the Playwright MCP tool to connect to `http://steamdeck:8081/`:

1. **Open CEF Debugging Interface**
   ```javascript
   // Using Playwright MCP
   mcp__playwright__browser_navigate({ url: "http://steamdeck:8081/" })
   ```

2. **Open Essential Debugging Tabs**
   ```javascript
   // QuickAccess_uid6 - Main plugin menu
   // Navigate to QuickAccess tab for primary plugin interface
   mcp__playwright__browser_click({
     element: "QuickAccess_uid6 link",
     ref: "quickaccess-link"
   })

   // Steam Big Picture Mode - Plugin sub-menus and dropdowns
   // Navigate for testing dropdown selections and plugin interactions
   mcp__playwright__browser_click({
     element: "Steam Big Picture Mode link",
     ref: "bigpicture-link"
   })

   // SharedJSContext - Console access
   // Navigate for JavaScript console debugging and API calls
   mcp__playwright__browser_click({
     element: "SharedJSContext link",
     ref: "console-link"
   })
   ```

3. **Live Testing and Interaction**
   ```javascript
   // In SharedJSContext console, test plugin API calls
   window.DeckyPlugin?.call('get_config')
   window.DeckyPlugin?.call('get_status')
   window.DeckyPlugin?.call('set_config', 'schedule', 8, 0, 60, 80, 'test schedule')

   // Test React component interactions in main plugin interface
   // Interact with dropdowns, sliders, and buttons in QuickAccess tab
   ```

#### Testing Workflow
1. **Main Plugin Menu** (QuickAccess_uid6):
   - Test React component rendering
   - Verify status display
   - Test configuration controls

2. **Plugin Sub-menus** (Steam Big Picture Mode):
   - Test dropdown selections
   - Verify menu navigation
   - Test mode switching

3. **Console Debugging** (SharedJSContext):
   - Test backend API calls
   - Monitor JavaScript errors
   - Verify frontend-backend communication

#### Backend Debugging (Python)
For backend issues, check Steam Deck logs:

```bash
# View Decky Loader logs on Steam Deck
ssh deck@steamdeck "journalctl --user -u decky-loader -f"

# Check plugin-specific logs
ssh deck@steamdeck "tail -f ~/.local/share/decky/logs/plugin_loader.log"
```

Python logging from `main.py`:
```python
import logging
logger = logging.getLogger("decky")
logger.info("Backend debug message")
```

### File Structure

```
deck-charge-scheduler/
├── src/
│   └── index.tsx              # React frontend
├── main.py                    # Python backend with @decky.callable
├── charge-scheduler.sh        # Bash script core
├── charge-scheduler.conf      # Configuration file
├── plugin.json               # Plugin metadata
├── package.json              # Node.js dependencies
├── Makefile                  # Remote deployment automation
├── .env                      # Connection credentials (gitignored)
├── .env.example              # Environment template
└── docs/decky/              # Decky development documentation
```

## Deployment Targets

### Remote Deployment Process

1. **Build**: `pnpm run build` creates `dist/` with compiled frontend
2. **Backup**: Optional backup of existing plugin (if `BACKUP_BEFORE_DEPLOY=true`)
3. **Transfer**: SCP copies files to Steam Deck plugin directory
4. **Permissions**: Sets executable permissions on bash script
5. **Verification**: Confirms all required files are present
6. **CEF Setup**: Enables debugging if configured

### Files Deployed

- `dist/` - Compiled React frontend
- `main.py` - Python backend with Decky API integration
- `plugin.json` - Plugin metadata and configuration
- `package.json` - Node.js dependency information
- `charge-scheduler.sh` - Bash script for charge control
- `charge-scheduler.conf` - Configuration file

## API Integration

### Decky Backend Methods

```python
@decky.callable
def get_config():
    """Load current configuration"""
    pass

@decky.callable
def set_config(mode, start_hour, start_minute, duration_minutes, charge_limit, description):
    """Save configuration changes"""
    pass

@decky.callable
def get_status():
    """Get current system status"""
    pass

@decky.callable
def apply_schedule_now():
    """Manually trigger schedule"""
    pass
```

### Frontend Integration

```typescript
import { callable } from "@decky/api";

const get_config = callable<any[], any>("get_config");
const set_config = callable<any[], any>("set_config");
const get_status = callable<any[], any>("get_status");

// Usage
const config = await get_config();
const status = await get_status();
await set_config("schedule", 8, 0, 60, 80, "Schedule description");
```

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Verify Steam Deck is accessible: `ssh deck@steamdeck`
   - Check network connectivity and hostname resolution
   - Ensure SSH is enabled in SteamOS settings

2. **Permission Denied**
   - Verify correct username and password/key
   - Check Steam Deck user permissions
   - Ensure plugin directory is writable

3. **CEF Debugging Not Working**
   - Verify `ENABLE_CEF_DEBUGGING=true` in `.env`
   - Check firewall settings on Steam Deck
   - Ensure port 8081 is accessible from development PC

4. **Plugin Not Loading**
   - Check Decky Loader logs: `journalctl --user -u decky-loader -f`
   - Verify plugin structure with `make verify`
   - Restart Decky Loader service

5. **Configuration Not Persisting**
   - Check file permissions on Steam Deck
   - Verify `charge-scheduler.conf` is writable
   - Check backend logs for errors

### Debug Commands

```bash
# Check remote deployment
make verify

# Test SSH connection
ssh -p 22 deck@steamdeck "ls -la /home/deck/homebrew/plugins/"

# Check Decky Loader status
ssh deck@steamdeck "systemctl --user status decky-loader"

# View plugin logs
ssh deck@steamdeck "tail -f ~/.local/share/decky/logs/plugin_loader.log"

# Check systemd timer status
ssh deck@steamdeck "systemctl --user status charge-scheduler.timer"
```

## Security Considerations

### Development Environment
- `.env` file is gitignored and contains sensitive credentials
- Use SSH key authentication instead of passwords when possible
- Network should be trusted for CEF debugging access
- Change default passwords in production environments

### Steam Deck Security
- Plugin runs with user privileges (deck user)
- No root access required for normal operation
- Systemd timer runs under user session scope
- Configuration files stored in user home directory

## Integration with Existing Documentation

Refer to `docs/decky/` for comprehensive Decky development documentation:

- `docs/decky/getting-started.md` - Basic Decky plugin development
- `docs/decky/plugin-dev.md` - Plugin architecture and best practices
- `docs/decky/cef-debugging.md` - Advanced CEF debugging techniques
- `docs/decky/backend-frontend-communication.md` - API integration patterns

## Performance Considerations

### Remote Development
- Minimize deployment frequency during development
- Use `make watch` for local frontend development
- Only deploy when testing backend integration
- Consider network latency for debugging responsiveness

### Plugin Performance
- Status updates every 5 seconds (configurable)
- Debounced configuration saving (300ms delay)
- Memory usage target: < 10MB
- Plugin load time target: < 2 seconds

## Future Enhancements

### Development Tools
- Automated testing integration
- Remote development server with hot reload
- Performance monitoring and profiling
- Advanced debugging tools integration

### Plugin Features
- Battery health analytics
- Smart schedule recommendations
- Multiple configuration profiles
- Mobile app remote control
- Full logs at `/home/deck/homebrew/logs/deck-charge-scheduler`