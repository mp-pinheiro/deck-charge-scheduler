#!/bin/bash

# Steam Deck Charge Scheduler Script
# Usage: ./charge-scheduler.sh [set|status] [value]

set -euo pipefail

# D-Bus interface for SteamOS Manager
DBUS_SERVICE="com.steampowered.SteamOSManager1"
DBUS_PATH="/com/steampowered/SteamOSManager1"
DBUS_INTERFACE="com.steampowered.SteamOSManager1.RootManager"
DBUS_METHOD="SetMaxChargeLevel"

# Log file
LOG_FILE="$HOME/.local/share/charge-scheduler.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Simple logging function that doesn't duplicate
simple_log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>/dev/null || true
}

# Check if running with proper permissions
check_permissions() {
    if ! gdbus call --system --dest "$DBUS_SERVICE" --object-path "$DBUS_PATH" --method "$DBUS_INTERFACE.$DBUS_METHOD" 80 >/dev/null 2>&1; then
        log "ERROR: Cannot access D-Bus interface. Make sure user has permission to control charging."
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
    # Default config (you can modify these)
    MODE="schedule"  # schedule, always_full, always_limit
    START_HOUR=8
    START_MINUTE=0
    DURATION_MINUTES=60
    CHARGE_LIMIT=80

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
    echo "Usage: $0 {set|status|schedule} [value]"
    echo ""
    echo "Commands:"
    echo "  set <50-100>     Set charge limit to specified percentage"
    echo "  status           Show current status"
    echo "  schedule         Check schedule and apply appropriate charge limit"
    echo ""
    echo "Examples:"
    echo "  $0 set 80        # Set charge limit to 80%"
    echo "  $0 status        # Show status"
    echo "  $0 schedule      # Check and apply schedule"
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