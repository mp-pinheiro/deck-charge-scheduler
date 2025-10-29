# Steam Deck Charge Scheduler

A comprehensive battery charge management solution for Steam Deck with both **standalone script** and **Decky plugin** options. Provides automated charging schedules, manual controls, and GUI configuration for optimal battery health.

## ✨ Features

- ⚡ **Dual Installation** - Choose between standalone script or Decky plugin
- 🎮 **GUI Configuration** - Easy-to-use Decky plugin interface (when installed as plugin)
- 🕒 **Time-based Charging** - Schedule charging windows for optimal battery health
- 🔋 **Charge Limiting** - Set custom charge limits (50-100%) to preserve battery
- 📊 **Automatic Operation** - Runs silently in the background every 5 minutes
- 📝 **Clean Logging** - Simple log file to track changes and debug issues
- 🎛️ **Preset Modes** - Quick configurations for Gaming, Daily Use, Battery Health
- 📱 **Manual Controls** - Immediate charge limit setting when needed
- 📈 **Real-time Status** - View current charge limits and next scheduled changes

## 🚀 Installation Options

### Option 1: Decky Plugin (Recommended)

The Decky plugin provides a user-friendly GUI for configuration and monitoring.

#### Prerequisites
- [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) installed on your Steam Deck
- Node.js and pnpm (for building)

#### Installation Options

**Option A: Direct Installation on Steam Deck**
```bash
git clone https://github.com/fairfruit/deck-charge-scheduler.git
cd deck-charge-scheduler
make full-setup    # Install + build + deploy + systemd setup
```

**Option B: Remote Development (Recommended)**
```bash
git clone https://github.com/fairfruit/deck-charge-scheduler.git
cd deck-charge-scheduler
cp .env.example .env
# Edit .env with Steam Deck connection details
ssh-copy-id deck@steamdeck.lan
make full-setup
```

#### Using the Plugin
1. Open Decky Loader settings
2. Navigate to "Deck Charge Scheduler"
3. Configure your schedule using the GUI
4. Choose from preset modes or customize your own schedule

### Option 2: Standalone Script

For users who prefer a lightweight command-line approach without Decky Loader.

#### 1. Copy the Script
```bash
# Make script executable
chmod +x charge-scheduler.sh

# Test manually
./charge-scheduler.sh set 80
```

#### 2. Install Systemd Timer
```bash
# Create user service directory
mkdir -p ~/.config/systemd/user

# Create service file
cat > ~/.config/systemd/user/charge-scheduler.service << 'EOF'
[Unit]
Description=Steam Deck Charge Scheduler
After=graphical-session.target

[Service]
Type=oneshot
ExecStart=/home/deck/git/deck-charge-scheduler/charge-scheduler.sh schedule
StandardOutput=null
StandardError=journal

[Install]
WantedBy=timer.target
EOF

# Create timer file
cat > ~/.config/systemd/user/charge-scheduler.timer << 'EOF'
[Unit]
Description=Run charge scheduler every 5 minutes
Requires=charge-scheduler.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable and start timer
systemctl --user daemon-reload
systemctl --user enable charge-scheduler.timer
systemctl --user start charge-scheduler.timer
```

#### 3. Verify Installation
```bash
# Check timer status
systemctl --user status charge-scheduler.timer

# Check recent activity
tail -5 ~/.local/share/charge-scheduler.log
```

## 📋 Usage

### Option 1: Decky Plugin GUI

When installed as a Decky plugin, you can configure everything through the graphical interface:

1. **Status Panel**: View current charge limit and next scheduled change
2. **Configuration Panel**:
   - Choose operating mode (Scheduled, Always Full, Always Limited)
   - Set charging schedule (start time, duration)
   - Configure charge limits
   - Use preset configurations (Gaming, Daily Use, Battery Health)
3. **Manual Control**: Set immediate charge limits
4. **Log Viewer**: Monitor scheduler activity

### Option 2: Command Line Interface

For standalone script usage:

```bash
# Set charge limit
./charge-scheduler.sh set <50-100>

# Check status
./charge-scheduler.sh status

# Apply schedule logic
./charge-scheduler.sh schedule

# View current configuration
./charge-scheduler.sh config

# Reload configuration and apply
./charge-scheduler.sh reload

# Show help
./charge-scheduler.sh help
```

### Configuration

#### GUI Configuration (Plugin)
Use the Decky plugin interface to easily configure all settings without editing files.

#### Manual Configuration (Script)
Edit the variables in `charge-scheduler.conf` to customize your schedule:

```bash
# Operating modes:
# - "schedule": Time-based charging windows
# - "always_full": Always charge to 100%
# - "always_limit": Always limit to configured percentage
MODE=schedule

# Schedule configuration (for "schedule" mode)
START_HOUR=8              # Start time: 8 AM
START_MINUTE=0            # Start minute: 00
DURATION_MINUTES=60       # Charging window: 1 hour
CHARGE_LIMIT=80           # Default limit: 80%
```

### Default Schedule

- **8:00 AM - 9:00 AM**: Charge to 100% (when you might need full battery)
- **All other times**: Limit to 80% (preserves battery health)
- **Check frequency**: Every 5 minutes

## 🔧 Technical Details

### How It Works

1. **D-Bus Integration**: Uses SteamOS Manager D-Bus API (`com.steampowered.SteamOSManager1.RootManager`)
2. **Method Call**: `SetMaxChargeLevel(value)` - sets the maximum battery charge percentage
3. **Systemd Timer**: Runs every 5 minutes to check and apply appropriate charge limits
4. **Log File**: Records all changes to `~/.local/share/charge-scheduler.log`

### Supported Charge Limits

- **Range**: 50-100% (SteamOS limitation)
- **Recommended**: 80% for daily use, 100% only when needed
- **Battery Health**: Lower limits (50-80%) significantly extend battery lifespan

## 📁 File Structure

```
deck-charge-scheduler/
├── Core Files
│   ├── charge-scheduler.sh      # Main bash script
│   ├── charge-scheduler.conf    # External configuration file
│   ├── main.py                  # Decky plugin backend
│   └── plugin.json              # Decky plugin metadata
├── Development Files
│   ├── .env                     # Development environment (gitignored)
│   ├── .env.example             # Environment template
│   ├── CLAUDE.md                # Remote development documentation
│   ├── Makefile                 # Remote deployment automation
│   └── scripts/
│       ├── debug-cef.sh         # CEF debugging helper
│       └── verify-deployment.sh # Deployment verification
├── Frontend Development
│   ├── package.json             # Node.js dependencies
│   ├── tsconfig.json            # TypeScript configuration
│   ├── rollup.config.js         # Build configuration
│   └── src/
│       ├── index.tsx            # React frontend component
│       └── types.d.ts           # TypeScript type definitions
├── Generated Files
│   ├── dist/                    # Built plugin files (generated)
│   └── node_modules/            # Node.js dependencies (generated)
├── Documentation
│   ├── README.md                # This file
│   ├── CHANGELOG.md             # Version history
│   └── docs/                    # Additional documentation
└── .gitignore                   # Git ignore rules
```

### System Files Created
```
~/.config/systemd/user/
├── charge-scheduler.service     # Systemd service
└── charge-scheduler.timer       # Systemd timer

~/.local/share/
└── charge-scheduler.log         # Activity log
```

## 🛠️ Troubleshooting

### Remote Development Issues

**SSH Connection Failed**
```bash
# Test SSH connection
ssh deck@steamdeck.lan

# Check network connectivity
ping steamdeck.lan

# Verify SSH is enabled on Steam Deck (Settings → Internet → SSH)
```

**Deployment Permission Errors**
```bash
# Check DECK_PASSWORD in .env file
cat .env | grep DECK_PASSWORD

# Verify sudo access on Steam Deck
ssh deck@steamdeck.lan "sudo whoami"
```

**CEF Debugging Not Working**
```bash
# Check CEF debugging port
nc -z steamdeck.lan 8081

# Verify CEF debugging is enabled in .env
grep ENABLE_CEF_DEBUGGING .env

# Manual debugging setup
./scripts/debug-cef.sh setup
```

**Build Errors**
```bash
# Install dependencies
make install

# Clean and rebuild
make clean
make build
```

### Common Issues

**Permission Denied**
```bash
# Make sure script is executable
chmod +x charge-scheduler.sh
```

**Timer Not Running**
```bash
# Check timer status
systemctl --user status charge-scheduler.timer

# Restart if needed
systemctl --user restart charge-scheduler.timer
```

**D-Bus Errors**
```bash
# Test D-Bus directly
gdbus call --system --dest com.steampowered.SteamOSManager1 \
  --object-path /com/steampowered/SteamOSManager1 \
  --method com.steampowered.SteamOSManager1.RootManager.SetMaxChargeLevel 80
```

### Logs

```bash
# View recent activity
tail -20 ~/.local/share/charge-scheduler.log

# Check systemd logs
journalctl --user -u charge-scheduler.service --since "1 hour ago"
```

## ⚙️ Advanced Configuration

### Custom Schedules

Edit the script to create custom charging patterns:

```bash
# Example: Overnight charging, day-time limiting
START_HOUR=2              # 2 AM start
DURATION_MINUTES=240      # 4 hour window (2-6 AM)
CHARGE_LIMIT=70           # 70% limit during day

# Example: Weekend vs weekday schedules
# (Would require script modifications)
```

### Multiple Charge Limits

For different scenarios:
- **Gaming**: Set to 100% before gaming sessions
- **Daily Use**: 80% limit for battery longevity
- **Storage**: 50% limit for long-term storage

## 🔧 Development

This project supports **remote development** from a PC to a Steam Deck with automatic deployment and CEF debugging.

### Quick Setup
```bash
# Clone and configure
git clone https://github.com/fairfruit/deck-charge-scheduler.git
cd deck-charge-scheduler
cp .env.example .env
# Edit .env with your Steam Deck details (DECK_HOST, DECK_USER, DECK_PASSWORD)

# Set up SSH key authentication (one-time)
ssh-copy-id deck@steamdeck.lan

# Full setup and deployment
make full-setup
```

### Development Commands
```bash
make deploy        # Build and deploy to Steam Deck
make watch         # Development with hot reload
make debug-cef     # Set up CEF debugging (Chrome DevTools at http://steamdeck.lan:8081)
make verify-full   # Comprehensive deployment verification
make help          # Show all commands
```

### Environment Configuration (.env)
```bash
DECK_HOST=steamdeck.lan
DECK_USER=deck
DECK_PASSWORD=your_password
ENABLE_CEF_DEBUGGING=true
CEF_DEBUG_PORT=8081
BACKUP_BEFORE_DEPLOY=true
```

### Development Scripts
```bash
./scripts/debug-cef.sh setup     # CEF debugging helper
./scripts/verify-deployment.sh   # Deployment verification
```

## 🔄 Migration from Standalone Script

If you were previously using the standalone script and want to upgrade to the Decky plugin:

1. **Keep existing systemd timer** - it will continue working
2. **Deploy the plugin** using `make deploy`
3. **Restart Decky Loader** to load the new plugin
4. **Configure via GUI** instead of editing files

## 🔄 Migration from Other Solutions

If you were previously using other charge management solutions:

1. **Disable old solutions** to avoid conflicts
2. **Install this plugin** using the steps above
3. **Configure your preferred schedule**
4. **Verify operation** through logs and status

### Benefits of This Approach
- ✅ **Dual Interface**: Both GUI and command-line options
- ✅ **Reliable Backend**: Proven bash script + systemd approach
- ✅ **Easy Configuration**: No need to edit files manually (when using plugin)
- ✅ **Standard Integration**: Uses SteamOS D-Bus API officially
- ✅ **Minimal Resources**: Lightweight and efficient
- ✅ **Transparent Operation**: Clear logging and status reporting

## 🤝 Contributing

Feel free to submit issues and pull requests to improve this scheduler!

## 📄 License

MIT License - do whatever you want with this script.

---

Built with ❤️ for Steam Deck battery health