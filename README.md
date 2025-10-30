# Steam Deck Charge Scheduler

A Decky plugin for Steam Deck that provides intelligent battery charge scheduling to prolong battery health. Schedule charging windows and set charge limits through an 
intuitive graphical interface.

## Disclaimer

This plugin was majorly developed using **AI coding assistance**. I wanted to experiment with the "vibe coding" hype and see how well it works for a cool side project. While I overviewed the code and tested it, I was definitely not as thorough as I'd usually be when writing my own code from scratch. **Please use this plugin responsibly and at your own risk.** I recommend reviewing the source code before installing it on your device.

## Features

- Time-based charging schedules for optimal battery health
- Custom charge limits (50-100%) to preserve battery lifespan
- Real-time status display and manual controls
- Background scheduling that runs automatically

## Installation

### Prerequisites
- Decky Loader installed on your Steam Deck

### Install from Source

```bash
git clone https://github.com/fairfruit/deck-charge-scheduler.git
cd deck-charge-scheduler
make install      # Install dependencies
make build        # Build the plugin
make deploy       # Deploy to Steam Deck
```

### Using the Plugin

1. Open Decky Loader settings
2. Navigate to "Deck Charge Scheduler"
3. Configure your schedule using the graphical interface
4. Choose from preset modes or customize your own schedule
5. The plugin automatically starts background scheduling

## Usage

The plugin provides an intuitive graphical interface for all configuration:

### Operating Modes
- **Scheduled**: Charge according to a time-based schedule
- **Always Full**: Maintain 100% charge continuously
- **Always Limited**: Maintain a set charge limit continuously

### Configuration Options
- **Schedule Settings**: Set start time and duration for charging windows
- **Charge Limits**: Configure maximum charge percentage (50-100%)
- **Charge Time**: Set how long you want max charge to last (when using `Scheduled` mode)

## How It Works

The plugin uses SteamOS's official D-Bus API to control battery charging:
- Integrates with the SteamOS Manager service
- Sets maximum charge levels through system APIs
- Runs background checks every 5 minutes
- Logs all changes for transparency

## License

MIT License - do whatever you want with this plugin.