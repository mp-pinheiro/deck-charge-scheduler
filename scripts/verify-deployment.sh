#!/bin/bash

# Deployment Verification Script for Steam Deck Plugin
# This script comprehensively verifies that the plugin is correctly deployed and functional

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default configuration
DECK_HOST=${DECK_HOST:-steamdeck}
DECK_USER=${DECK_USER:-deck}
DECK_PLUGIN_DIR=${DECK_PLUGIN_DIR:-/home/deck/homebrew/plugins/deck-charge-scheduler}

echo -e "${BLUE}🔍 Plugin Deployment Verification${NC}"
echo "================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo
    echo -e "${BLUE}$1${NC}"
    echo "----------------------------------------"
}

# Check if environment is configured
check_environment() {
    print_header "Environment Configuration"

    if [ ! -f ".env" ]; then
        print_error ".env file not found"
        return 1
    fi

    print_status ".env file found"
    print_info "Deck Host: $DECK_HOST"
    print_info "Deck User: $DECK_USER"
    print_info "Plugin Directory: $DECK_PLUGIN_DIR"

    # Check required environment variables
    local required_vars=("DECK_HOST" "DECK_USER" "DECK_PLUGIN_DIR")
    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing environment variables: ${missing_vars[*]}"
        return 1
    fi

    return 0
}

# Test network connectivity
test_connectivity() {
    print_header "Network Connectivity"

    if ping -c 1 "$DECK_HOST" &>/dev/null; then
        print_status "Network connectivity to $DECK_HOST"
    else
        print_error "Cannot reach $DECK_HOST"
        return 1
    fi

    # Test SSH connection
    if ssh -o ConnectTimeout=5 -o BatchMode=yes "$DECK_USER@$DECK_HOST" "echo 'SSH OK'" 2>/dev/null; then
        print_status "SSH connection to $DECK_USER@$DECK_HOST"
    else
        print_error "SSH connection failed"
        print_info "Check SSH authentication and connectivity"
        return 1
    fi
}

# Verify plugin directory structure
verify_plugin_structure() {
    print_header "Plugin Directory Structure"

    # Check if plugin directory exists
    if ssh "$DECK_USER@$DECK_HOST" "[ -d '$DECK_PLUGIN_DIR' ]"; then
        print_status "Plugin directory exists: $DECK_PLUGIN_DIR"
    else
        print_error "Plugin directory not found: $DECK_PLUGIN_DIR"
        print_info "Run 'make deploy' to install the plugin"
        return 1
    fi

    # Check required files
    local required_files=(
        "dist/index.js"
        "dist/index.js.map"
        "plugin.json"
        "main.py"
        "package.json"
        "charge-scheduler.sh"
        "charge-scheduler.conf"
    )

    local missing_files=()

    for file in "${required_files[@]}"; do
        if ssh "$DECK_USER@$DECK_HOST" "[ -f '$DECK_PLUGIN_DIR/$file' ]"; then
            print_status "Found: $file"
        else
            print_error "Missing: $file"
            missing_files+=("$file")
        fi
    done

    if [ ${#missing_files[@]} -gt 0 ]; then
        print_error "Plugin deployment is incomplete"
        return 1
    fi

    # Check executable permissions
    if ssh "$DECK_USER@$DECK_HOST" "[ -x '$DECK_PLUGIN_DIR/charge-scheduler.sh' ]"; then
        print_status "charge-scheduler.sh has executable permissions"
    else
        print_warning "charge-scheduler.sh lacks executable permissions"
        ssh "$DECK_USER@$DECK_HOST" "chmod +x '$DECK_PLUGIN_DIR/charge-scheduler.sh'"
        print_status "Fixed: Set executable permissions on charge-scheduler.sh"
    fi

    return 0
}

# Verify Decky Loader status
verify_decky_loader() {
    print_header "Decky Loader Status"

    # Check if Decky Loader is running
    local decky_status
    decky_status=$(ssh "$DECK_USER@$DECK_HOST" "systemctl --user is-active decky-loader 2>/dev/null || echo 'unknown'")

    if [ "$decky_status" = "active" ]; then
        print_status "Decky Loader is running"
    else
        print_warning "Decky Loader status: $decky_status"
        print_info "Decky Loader may be running but systemctl --user might not work in SSH session"
        # Don't fail the check since Decky Loader might be running even if systemctl --user doesn't work
    fi

    # Check if plugin is loaded
    local plugin_logs
    plugin_logs=$(ssh "$DECK_USER@$DECK_HOST" "journalctl --user -u decky-loader --no-pager -n 20 2>/dev/null | grep -i 'charge-scheduler' || true")

    if [ -n "$plugin_logs" ]; then
        print_status "Plugin logs found in Decky Loader"
        print_info "Recent plugin activity detected"
    else
        print_warning "No recent plugin logs found"
        print_info "Plugin may not be loaded yet - try restarting Decky Loader"
    fi

    return 0
}

# Verify plugin configuration
verify_plugin_config() {
    print_header "Plugin Configuration"

    # Check plugin.json
    local plugin_name
    plugin_name=$(ssh "$DECK_USER@$DECK_HOST" "cat '$DECK_PLUGIN_DIR/plugin.json' | python3 -c 'import sys, json; print(json.load(sys.stdin).get(\"name\", \"Unknown\"))' 2>/dev/null || echo 'Parse failed'")

    if [ "$plugin_name" != "Parse failed" ]; then
        print_status "Plugin name: $plugin_name"
    else
        print_error "Failed to parse plugin.json"
        return 1
    fi

    # Check charge-scheduler.conf
    if ssh "$DECK_USER@$DECK_HOST" "[ -f '$DECK_PLUGIN_DIR/charge-scheduler.conf' ]"; then
        local config_size
        config_size=$(ssh "$DECK_USER@$DECK_HOST" "wc -l < '$DECK_PLUGIN_DIR/charge-scheduler.conf'")
        print_status "Configuration file found ($config_size lines)"
    else
        print_error "Configuration file not found"
        return 1
    fi

    return 0
}

# Verify systemd timer
verify_systemd_timer() {
    print_header "Systemd Timer Status"

    # Check if timer exists
    if ssh "$DECK_USER@$DECK_HOST" "systemctl --user list-unit-files | grep -q 'charge-scheduler.timer'"; then
        print_status "charge-scheduler.timer is registered"
    else
        print_warning "charge-scheduler.timer not found"
        print_info "Run 'make deploy-systemd' to set up the timer"
        return 1
    fi

    # Check timer status
    local timer_status
    timer_status=$(ssh "$DECK_USER@$DECK_HOST" "systemctl --user is-active charge-scheduler.timer 2>/dev/null || echo 'inactive'")

    if [ "$timer_status" = "active" ]; then
        print_status "charge-scheduler.timer is active"
    else
        print_warning "charge-scheduler.timer is $timer_status"
        print_info "Enable timer: systemctl --user enable charge-scheduler.timer --now"
    fi

    # Check service status
    local service_status
    service_status=$(ssh "$DECK_USER@$DECK_HOST" "systemctl --user is-active charge-scheduler.service 2>/dev/null || echo 'inactive'")

    if [ "$service_status" = "active" ] || [ "$service_status" = "activating" ]; then
        print_status "charge-scheduler.service is $service_status"
    else
        print_info "charge-scheduler.service is $service_status (normal for timer-based service)"
    fi

    return 0
}

# Verify CEF debugging
verify_cef_debugging() {
    print_header "CEF Debugging"

    # Check if CEF port is accessible
    if nc -z "$DECK_HOST" "${CEF_DEBUG_PORT:-8081}" 2>/dev/null; then
        print_status "CEF debugging port ${CEF_DEBUG_PORT:-8081} is accessible"
        print_info "Debug URL: http://$DECK_HOST:${CEF_DEBUG_PORT:-8081}"
    else
        print_warning "CEF debugging port ${CEF_DEBUG_PORT:-8081} not accessible"
        print_info "Enable CEF debugging in .env: ENABLE_CEF_DEBUGGING=true"
    fi

    return 0
}

# Test plugin functionality
test_plugin_functionality() {
    print_header "Plugin Functionality Test"

    # Test charge scheduler script
    if ssh "$DECK_USER@$DECK_HOST" "cd '$DECK_PLUGIN_DIR' && ./charge-scheduler.sh status"; then
        print_status "charge-scheduler.sh script is functional"
    else
        print_error "charge-scheduler.sh script failed"
        return 1
    fi

    # Test D-Bus communication (if possible)
    local dbus_test
    dbus_test=$(ssh "$DECK_USER@$DECK_HOST" "gdbus call --session --dest com.valvesoftware.steamos_powermanager --object-path /com/valvesoftware/steamos_powermanager --method com.valvesoftware.steamos_powermanager.GetBatteryPercentage 2>/dev/null || echo 'DBUS_ERROR'")

    if [ "$dbus_test" != "DBUS_ERROR" ]; then
        print_status "D-Bus communication working"
        print_info "Battery percentage: $dbus_test"
    else
        print_warning "D-Bus communication test failed"
        print_info "This may affect plugin functionality"
    fi

    return 0
}

# Generate summary report
generate_summary() {
    print_header "Verification Summary"

    local total_checks=0
    local passed_checks=0
    local failed_checks=0

    # Count all the checks that were performed
    local checks=(
        "Environment Configuration"
        "Network Connectivity"
        "Plugin Directory Structure"
        "Decky Loader Status"
        "Plugin Configuration"
        "Systemd Timer Status"
        "CEF Debugging"
        "Plugin Functionality"
    )

    for check in "${checks[@]}"; do
        total_checks=$((total_checks + 1))
    done

    # This would be more sophisticated with proper tracking
    # For now, we'll just provide a summary of what was checked
    print_info "Completed $total_checks verification checks"

    echo
    print_status "Deployment verification completed!"
    echo
    print_info "Next steps:"
    print_info "1. If any checks failed, address the issues shown above"
    print_info "2. Restart Decky Loader if needed: systemctl --user restart decky-loader"
    print_info "3. Test the plugin in the Steam Deck interface"
    print_info "4. For debugging, run: ./scripts/debug-cef.sh"
    echo
    print_info "For support, refer to CLAUDE.md documentation"
}

# Main verification function
main() {
    local failed_checks=0

    # Run all verification steps
    if ! check_environment; then
        failed_checks=$((failed_checks + 1))
    fi

    if ! test_connectivity; then
        failed_checks=$((failed_checks + 1))
    fi

    if ! verify_plugin_structure; then
        failed_checks=$((failed_checks + 1))
    fi

    if ! verify_decky_loader; then
        failed_checks=$((failed_checks + 1))
    fi

    if ! verify_plugin_config; then
        failed_checks=$((failed_checks + 1))
    fi

    if ! verify_systemd_timer; then
        failed_checks=$((failed_checks + 1))
    fi

    verify_cef_debugging || true  # Don't fail if CEF debugging isn't working

    if ! test_plugin_functionality; then
        failed_checks=$((failed_checks + 1))
    fi

    # Generate summary
    generate_summary

    # Exit with error code if any checks failed
    if [ $failed_checks -gt 0 ]; then
        print_error "$failed_checks verification checks failed"
        exit 1
    fi

    exit 0
}

# Run main function
main "$@"