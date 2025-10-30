#!/bin/bash

# Steam Deck Charge Scheduler Script
# Usage: ./charge-scheduler.sh [set|status] [value]

# Fix for SteamOS readline issue when called from subprocess
# Removed set +e - let errors be visible instead of silent

# D-Bus interface for SteamOS Manager
DBUS_SERVICE="com.steampowered.SteamOSManager1"
DBUS_PATH="/com/steampowered/SteamOSManager1"
DBUS_INTERFACE="com.steampowered.SteamOSManager1.RootManager"
DBUS_METHOD="SetMaxChargeLevel"

# Log file
LOG_FILE="$HOME/.local/share/charge-scheduler.log"

# Configuration file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/charge-scheduler.conf"

# Load configuration from external file - NO FALLBACKS
load_config() {
    # Only try to load from JSON settings file - FAIL LOUDLY if not found
    local json_settings_file="$HOME/homebrew/data/deck-charge-scheduler/settings.json"
    if [ -f "$json_settings_file" ]; then
        # Parse JSON using simple string extraction (more portable than jq)
        MODE=$(grep -o '"MODE"[[:space:]]*:[[:space:]]*"[^"]*"' "$json_settings_file" | sed 's/.*"MODE"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
        START_HOUR=$(grep -o '"START_HOUR"[[:space:]]*:[[:space:]]*[0-9]*' "$json_settings_file" | sed 's/.*"START_HOUR"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/')
        START_MINUTE=$(grep -o '"START_MINUTE"[[:space:]]*:[[:space:]]*[0-9]*' "$json_settings_file" | sed 's/.*"START_MINUTE"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/')
        DURATION_MINUTES=$(grep -o '"DURATION_MINUTES"[[:space:]]*:[[:space:]]*[0-9]*' "$json_settings_file" | sed 's/.*"DURATION_MINUTES"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/')
        CHARGE_LIMIT=$(grep -o '"CHARGE_LIMIT"[[:space:]]*:[[:space:]]*[0-9]*' "$json_settings_file" | sed 's/.*"CHARGE_LIMIT"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/')
        simple_log "Loaded configuration from JSON settings file"
    else
        # FAIL LOUDLY - No fallbacks, show the actual problem
        echo "ERROR: JSON configuration file not found: $json_settings_file"
        echo "ERROR: Plugin configuration not loaded properly"
        echo "ERROR: Fix: Ensure plugin can write to $HOME/homebrew/data/deck-charge-scheduler/"
        exit 1
    fi

    # Validate that required variables were actually loaded
    if [ -z "$MODE" ] || [ -z "$START_HOUR" ] || [ -z "$START_MINUTE" ] || [ -z "$DURATION_MINUTES" ] || [ -z "$CHARGE_LIMIT" ]; then
        echo "ERROR: Failed to parse JSON configuration file"
        echo "ERROR: Required configuration values missing"
        exit 1
    fi
}

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Simple logging function - FAIL LOUDLY if logging broken
simple_log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    if [ $? -ne 0 ]; then
        echo "ERROR: Cannot write to log file: $LOG_FILE"
        echo "ERROR: Fix: Ensure directory exists and write permissions: $HOME/.local/share/"
    fi
}

# Check if running with proper permissions
check_permissions() {
    if ! gdbus call --system --dest "$DBUS_SERVICE" --object-path "$DBUS_PATH" --method "$DBUS_INTERFACE.$DBUS_METHOD" 80 >/dev/null 2>&1; then
        log "ERROR: Cannot access D-Bus interface. SteamOS charge control API not available."
        exit 1
    fi
}

# Set charge limit
set_charge_limit() {
    local limit="$1"

    # Validate input
    if ! [[ "$limit" =~ ^[0-9]+$ ]] || [ "$limit" -lt 50 ] || [ "$limit" -gt 100 ]; then
        log "ERROR: Charge limit must be between 50 and 100"
        echo "Usage: $0 set <50-100>"
        exit 1
    fi

    simple_log "Setting charge limit to $limit%"

    # Set charge limit via D-Bus
    if result=$(gdbus call --system --dest "$DBUS_SERVICE" --object-path "$DBUS_PATH" --method "$DBUS_INTERFACE.$DBUS_METHOD" "$limit" 2>&1); then
        simple_log "Successfully set charge limit to $limit%"
        echo "Charge limit set to $limit%"
    else
        simple_log "ERROR: Failed to set charge limit: $result"
        exit 1
    fi
}

# Get current status (placeholder since we can't read back the value)
get_status() {
    echo "Steam Deck Charge Scheduler Status:"
    echo "Current limit: Unknown (D-Bus doesn't support reading back)"
    echo "Last change: Check log file $LOG_FILE"
}

# Schedule check based on time windows
check_schedule() {
    # Load configuration from external file
    load_config

    current_hour=$(date +%H)
    current_minute=$(date +%M)
    current_total=$((current_hour * 60 + current_minute))
    start_total=$((START_HOUR * 60 + START_MINUTE))
    end_total=$((start_total + DURATION_MINUTES))

    # Handle overnight schedule
    if [ $end_total -gt 1440 ]; then
        end_total=$((end_total - 1440))
        if [ $current_total -ge $start_total ] || [ $current_total -lt $end_total ]; then
            target_limit=100
        else
            target_limit=$CHARGE_LIMIT
        fi
    else
        if [ $current_total -ge $start_total ] && [ $current_total -lt $end_total ]; then
            target_limit=100
        else
            target_limit=$CHARGE_LIMIT
        fi
    fi

    simple_log "Schedule check: Mode=$MODE, Current time=${current_hour}:${current_minute}, Target limit=$target_limit%"

    case "$MODE" in
        "always_full")
            set_charge_limit 100
            ;;
        "always_limit")
            set_charge_limit "$CHARGE_LIMIT"
            ;;
        "schedule")
            set_charge_limit "$target_limit"
            ;;
        *)
            simple_log "ERROR: Unknown mode: $MODE"
            exit 1
            ;;
    esac
}

# Show usage
usage() {
    echo "Steam Deck Charge Scheduler Script"
    echo "Usage: $0 {set|status|schedule|config|reload} [value]"
    echo ""
    echo "Commands:"
    echo "  set <50-100>     Set charge limit to specified percentage"
    echo "  status           Show current status"
    echo "  schedule         Check schedule and apply appropriate charge limit"
    echo "  config           Show current configuration"
    echo "  reload           Reload configuration and apply schedule"
    echo ""
    echo "Examples:"
    echo "  $0 set 80        # Set charge limit to 80%"
    echo "  $0 status        # Show status"
    echo "  $0 schedule      # Check and apply schedule"
    echo "  $0 config        # Show current configuration"
    echo "  $0 reload        # Reload and apply configuration"
    echo ""
    echo "Crontab example:"
    echo "  */5 * * * * /path/to/charge-scheduler.sh schedule"
}

# Main script logic
main() {
    # Create log directory if needed
    mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

    case "${1:-}" in
        "set")
            if [ -z "${2:-}" ]; then
                usage
                exit 1
            fi
            check_permissions
            set_charge_limit "$2"
            ;;
        "status")
            get_status
            ;;
        "schedule")
            check_permissions
            check_schedule
            ;;
        "config")
            # Show current configuration
            load_config
            echo "Current Configuration:"
            echo "  Mode: $MODE"
            echo "  Start Time: ${START_HOUR}:${START_MINUTE}"
            echo "  Duration: ${DURATION_MINUTES} minutes"
            echo "  Charge Limit: ${CHARGE_LIMIT}%"
            echo "  Config File: $CONFIG_FILE"
            ;;
        "reload")
            # Reload configuration and apply
            load_config
            check_permissions
            check_schedule
            ;;
        "help"|"--help"|"-h"|"")
            usage
            ;;
        *)
            echo "ERROR: Unknown command: $1"
            usage
            exit 1
            ;;
    esac
}

main "$@"