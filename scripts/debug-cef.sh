#!/bin/bash

# CEF Debugging Helper for Steam Deck Plugin
# This script helps set up and manage CEF debugging for the plugin

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
CEF_DEBUG_PORT=${CEF_DEBUG_PORT:-8081}
DECKY_LOADER_URL=${DECKY_LOADER_URL:-http://steamdeck:8081}

echo -e "${BLUE}🔧 CEF Debugging Helper${NC}"
echo "========================="

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

# Check if environment is configured
check_environment() {
    if [ ! -f ".env" ]; then
        print_error ".env file not found. Please copy .env.example to .env and configure."
        exit 1
    fi

    print_status "Environment configuration loaded"
    print_info "Deck Host: $DECK_HOST"
    print_info "CEF Debug Port: $CEF_DEBUG_PORT"
}

# Test network connectivity to Steam Deck
test_connectivity() {
    print_info "Testing network connectivity to $DECK_HOST..."

    if ping -c 1 "$DECK_HOST" &>/dev/null; then
        print_status "Network connectivity to $DECK_HOST is working"
    else
        print_error "Cannot reach $DECK_HOST. Please check:"
        print_error "1. Steam Deck is powered on"
        print_error "2. Both devices are on the same network"
        print_error "3. Hostname resolution is working"
        exit 1
    fi
}

# Test CEF debugging port
test_cef_port() {
    print_info "Testing CEF debugging port connection..."

    if nc -z "$DECK_HOST" "$CEF_DEBUG_PORT" 2>/dev/null; then
        print_status "CEF debugging port $CEF_DEBUG_PORT is accessible"
    else
        print_warning "CEF debugging port $CEF_DEBUG_PORT is not accessible"
        print_info "This is normal if the plugin is not running or debugging is disabled"
        print_info "Try: make deploy to ensure the plugin is installed and running"
    fi
}

# Enable CEF debugging on Steam Deck
enable_cef_debugging() {
    print_info "Enabling CEF debugging on Steam Deck..."

    # Check if we can connect via SSH
    if ! ssh -o ConnectTimeout=5 "$DECK_USER@$DECK_HOST" "echo 'SSH connection test'" 2>/dev/null; then
        print_error "Cannot connect to Steam Deck via SSH"
        print_info "Please ensure SSH is configured properly"
        exit 1
    fi

    # Enable CEF debugging environment variable
    ssh "$DECK_USER@$DECK_HOST" "
        if ! grep -q 'DECKY_CEF_DEBUG' ~/.bashrc; then
            echo 'export DECKY_CEF_DEBUG=1' >> ~/.bashrc
            echo 'export DECKY_CEF_DEBUG_PORT=$CEF_DEBUG_PORT' >> ~/.bashrc
            echo 'CEF debugging enabled in ~/.bashrc'
        else
            echo 'CEF debugging already configured in ~/.bashrc'
        fi
    "

    print_status "CEF debugging enabled on Steam Deck"
    print_warning "You may need to restart Decky Loader for changes to take effect"
}

# Open Chrome DevTools for debugging
open_chrome_devtools() {
    print_info "Opening Chrome DevTools for CEF debugging..."

    # Try different Chrome/Chromium commands
    CHROME_CMDS=(
        "google-chrome"
        "google-chrome-stable"
        "chromium"
        "chromium-browser"
    )

    for chrome_cmd in "${CHROME_CMDS[@]}"; do
        if command -v "$chrome_cmd" &> /dev/null; then
            print_info "Using $chrome_cmd for debugging"

            # Open Chrome with remote debugging URL
            "$chrome_cmd" --remote-debugging-port=9222 \
                          --new-window \
                          "chrome://inspect" &

            # Instructions for the user
            echo
            print_info "Chrome DevTools opened. Follow these steps:"
            print_info "1. In Chrome DevTools, click on 'Configure...'"
            print_info "2. Add '$DECK_HOST:$CEF_DEBUG_PORT' to the target list"
            print_info "3. Look for 'SharedJSContext' under 'Remote Target'"
            print_info "4. Click 'inspect' to open the debugging console"
            echo
            print_info "Alternatively, navigate directly to: $DECKY_LOADER_URL"

            return 0
        fi
    done

    print_error "No Chrome/Chromium browser found"
    print_info "Please install Chrome or Chromium and try again"
    print_info "Then manually navigate to chrome://inspect and add $DECK_HOST:$CEF_DEBUG_PORT"
}

# Deploy plugin with debugging enabled
deploy_with_debugging() {
    print_info "Deploying plugin with CEF debugging enabled..."

    # Ensure CEF debugging is enabled in environment
    if [ "$ENABLE_CEF_DEBUGGING" != "true" ]; then
        print_warning "ENABLE_CEF_DEBUGGING is not set to 'true' in .env"
        print_info "Consider enabling it for debugging"
    fi

    # Deploy the plugin
    if command -v make &> /dev/null; then
        make deploy
    else
        print_error "Make command not found. Please ensure Make is installed."
        exit 1
    fi

    print_status "Plugin deployed with debugging enabled"
}

# Show debugging tips
show_debugging_tips() {
    echo
    print_info "🐛 Debugging Tips:"
    echo
    echo "Frontend (React) Debugging:"
    echo "- Use Chrome DevTools console for JavaScript debugging"
    echo "- Access React DevTools if available"
    echo "- Use console.log() in your React components"
    echo "- Check Network tab for API calls to backend"
    echo
    echo "Backend (Python) Debugging:"
    echo "- Check logs: ssh $DECK_USER@$DECK_HOST 'journalctl --user -u decky-loader -f'"
    echo "- Use logging.getLogger('decky').info() in Python code"
    echo "- Monitor ~/.local/share/decky/logs/ directory"
    echo
    echo "Plugin State:"
    echo "- Use window.DeckyPlugin in browser console to access plugin API"
    echo "- Check if @decky.callable methods are registered properly"
    echo "- Verify frontend-backend communication"
    echo
}

# Main menu
show_menu() {
    echo
    echo "Available options:"
    echo "1) Test connectivity"
    echo "2) Enable CEF debugging on Steam Deck"
    echo "3) Deploy plugin with debugging"
    echo "4) Open Chrome DevTools"
    echo "5) Run full debugging setup (1-4)"
    echo "6) Show debugging tips"
    echo "7) Exit"
    echo
}

# Main execution
main() {
    # Check environment first
    check_environment

    if [ $# -eq 0 ]; then
        # Interactive mode
        while true; do
            show_menu
            read -p "Choose an option (1-7): " choice
            echo

            case $choice in
                1)
                    test_connectivity
                    test_cef_port
                    ;;
                2)
                    enable_cef_debugging
                    ;;
                3)
                    deploy_with_debugging
                    ;;
                4)
                    open_chrome_devtools
                    ;;
                5)
                    test_connectivity
                    test_cef_port
                    enable_cef_debugging
                    deploy_with_debugging
                    open_chrome_devtools
                    ;;
                6)
                    show_debugging_tips
                    ;;
                7)
                    print_status "Goodbye!"
                    exit 0
                    ;;
                *)
                    print_error "Invalid option. Please choose 1-7."
                    ;;
            esac
        done
    else
        # Command line mode
        case "$1" in
            "test")
                test_connectivity
                test_cef_port
                ;;
            "enable")
                enable_cef_debugging
                ;;
            "deploy")
                deploy_with_debugging
                ;;
            "chrome")
                open_chrome_devtools
                ;;
            "setup")
                test_connectivity
                test_cef_port
                enable_cef_debugging
                deploy_with_debugging
                open_chrome_devtools
                ;;
            "tips")
                show_debugging_tips
                ;;
            *)
                echo "Usage: $0 [test|enable|deploy|chrome|setup|tips]"
                echo "  test   - Test connectivity and CEF port"
                echo "  enable - Enable CEF debugging on Steam Deck"
                echo "  deploy - Deploy plugin with debugging enabled"
                echo "  chrome - Open Chrome DevTools"
                echo "  setup  - Run full debugging setup"
                echo "  tips   - Show debugging tips"
                exit 1
                ;;
        esac
    fi
}

# Run main function
main "$@"