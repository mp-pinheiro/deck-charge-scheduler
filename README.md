# Steam Deck Charge Scheduler

A simple bash script and systemd timer for automated battery charge scheduling on Steam Deck using the SteamOS D-Bus API.

## ✨ Features

- ⚡ **Simple Setup** - No complex Decky plugin or sudo configuration required
- 🕒 **Time-based Charging** - Schedule charging windows for optimal battery health
- 🔋 **Charge Limiting** - Set custom charge limits (50-100%) to preserve battery
- 📊 **Automatic Operation** - Runs silently in the background every 5 minutes
- 📝 **Clean Logging** - Simple log file to track changes and debug issues

## 🚀 Quick Start

### 1. Copy the Script
```bash
# Make script executable
chmod +x charge-scheduler.sh

# Test manually
./charge-scheduler.sh set 80
```

### 2. Install Systemd Timer
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

### 3. Verify Installation
```bash
# Check timer status
systemctl --user status charge-scheduler.timer

# Check recent activity
tail -5 ~/.local/share/charge-scheduler.log
```

## 📋 Usage

### Command Line Interface
```bash
# Set charge limit
./charge-scheduler.sh set <50-100>

# Check status
./charge-scheduler.sh status

# Apply schedule logic
./charge-scheduler.sh schedule

# Show help
./charge-scheduler.sh help
```

### Configuration

Edit the variables in `charge-scheduler.sh` to customize your schedule:

```bash
# Operating modes:
# - "schedule": Time-based charging windows
# - "always_full": Always charge to 100%
# - "always_limit": Always limit to configured percentage
MODE="schedule"

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
├── charge-scheduler.sh          # Main script
├── README.md                    # This file
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

## 🔄 Migration from Decky Plugin

If you were previously using the Decky plugin:

1. **Disable the plugin** in Decky Loader settings
2. **Remove the plugin** files if desired
3. **Follow the installation steps** above for this script
4. **Configure your schedule** in the script variables

This approach is more reliable than the Decky plugin because:
- ✅ No dependency on Decky Loader
- ✅ Works regardless of UI state
- ✅ Minimal resource usage
- ✅ Standard Linux system integration

## 🤝 Contributing

Feel free to submit issues and pull requests to improve this scheduler!

## 📄 License

MIT License - do whatever you want with this script.

---

Built with ❤️ for Steam Deck battery health