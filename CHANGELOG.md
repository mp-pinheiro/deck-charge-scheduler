# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.4] - 2024-10-30

### Changed
- **Error Handling Philosophy**: Implemented "fail fast, fail clearly" approach throughout the entire plugin
- **Background Scheduler**: Replaced systemd timer with native Decky background tasks for better integration
- **Status Display**: Enhanced UI to show actual error states instead of hiding problems with fallbacks
- **Configuration Loading**: Eliminated multi-layer fallback chain in favor of single source of truth

### Fixed
- **Hidden Errors**: Removed all error hiding patterns that were masking actual configuration and system problems
- **Bash Script Error Handling**: Removed `set +e` and silent fallbacks that made debugging difficult
- **Python Backend Exceptions**: Configuration and status methods now raise exceptions instead of returning fallback data
- **React Frontend Fallbacks**: Eliminated fake status generation and default value fallbacks
- **JSON Configuration**: Now fails loudly when configuration file is missing or corrupted

### Removed
- **Error Fallback Mechanisms**: Three-layer fallback chain in bash script configuration loading
- **Fake Status Generation**: `setFallbackStatus()` function that created misleading status information
- **Silent Failures**: All `set +e` patterns and catch-all exception handlers that hid problems
- **Default Value Fallbacks**: Frontend default values (?? operators) that masked backend failures
- **Systemd Timer Dependency**: Plugin now uses native Decky background tasks instead

### Added
- **Background Task Management**: Native Decky asyncio-based scheduler with proper lifecycle management
- **Scheduler Status Display**: Visual indicators showing background scheduler running/active state
- **Configuration Validation**: Explicit checks for required configuration variables with clear error messages
- **Debugging Commands**: Documentation for checking actual system battery charge levels
- **Exception Propagation**: Proper error reporting from backend to frontend with specific error details

### Improved
- **Error Visibility**: All configuration, status, and communication errors are now immediately visible to users
- **Debugging Experience**: Clear error messages and status indicators help identify actual problems
- **System Integration**: Better HOME environment handling for subprocess calls
- **Log Output**: Enhanced logging with failure detection for log file writes

### Technical Details
- **Bash Script**: Removed silent error suppression and multi-source configuration loading
- **Python Backend**: Added proper exception handling with `raise Exception()` instead of return defaults
- **React Frontend**: Eliminated fallback mechanisms, added null state handling with error display
- **Background Tasks**: Implemented asyncio-based scheduler with proper cancellation handling
- **Configuration Flow**: Single JSON configuration source with validation and loud failures

## [1.1.3] - 2024-10-30

### Changed
- **Auto-apply Configuration**: Removed manual "Apply Schedule Now" button - configurations now apply automatically after saving
- **Information Panel Position**: Moved Information section to top of interface for better visibility
- **Mode Display**: Cleaned up mode dropdown text to show "Always Limit" instead of "Always Limit to 80%"
- **Navigation Improvements**: Added scroll container with 80vh max height for better Steam Deck controller navigation

### Fixed
- **Controller Scrolling**: Implemented proper D-pad scrolling with overflow handling for Steam Deck controllers
- **UI Layout**: Reorganized panel sections for improved user experience

### Removed
- **Manual Apply Button**: Eliminated redundant "Apply Schedule Now" button functionality
- **Unused Code**: Cleaned up ButtonItem import and unused state variables (loading, applying, applyNow function)

## [1.1.2] - 2024-10-30

### Fixed
- **Deployment Permission Issues**: Resolved root ownership problems with temp directory + sudo move approach
- **Configuration Persistence**: Fixed user configurations to persist across plugin updates using proper runtime directory
- **Backend Configuration System**: Replaced non-functional SettingsManager with DECKY_PLUGIN_RUNTIME_DIR pattern
- **JSON File Operations**: Implemented proper JSON-based configuration storage in runtime directory
- **User Data Directories**: Added automatic creation of required directories during deployment
- **Bash Script Integration**: Maintained compatibility with runtime config generation for script backend

### Changed
- **Configuration Architecture**: Moved from bash config file parsing to JSON-based backend storage
- **Deployment Process**: Updated to use temporary directory with sudo move instead of direct file operations
- **Runtime Directory**: Now follows Decky best practices using DECKY_PLUGIN_RUNTIME_DIR environment variable

### Improved
- **Error Handling**: Enhanced configuration operations with comprehensive logging and exception handling
- **Plugin Reliability**: Configuration now survives plugin restarts and updates
- **Deployment Reliability**: Eliminated permission errors during plugin installation

## [1.1.1] - 2024-10-30

### Fixed
- **Subprocess Compatibility**: Changed from bash to sh to resolve SteamOS readline library issues
- **Slider Persistence**: Fixed charge limit slider to properly save changes immediately without stale closure issues
- **Status Display Logic**: Cleaned up get_status() to show correct current limits based on mode and schedule time
- **Time Display**: Updated duration display to show time range format (e.g., "8:00 - 9:00") instead of just end time
- **Plugin Loading**: Added explicit main.py entry point to plugin.json for proper backend initialization
- **Deployment Process**: Improved deployment to completely remove existing plugin before fresh installation

### Improved
- **Status Calculation**: Better time-based status calculation for schedule mode without relying on stale log parsing
- **Error Handling**: Enhanced subprocess error handling with better environment configuration
- **UI Text**: Simplified "Always limit to 80%" to "Always limit" for cleaner interface
- **Documentation**: Added log location reference for troubleshooting guidance

## [1.1.0] - 2024-10-29

### Added
- **Remote Development Setup**: Complete support for developing on PC and deploying to Steam Deck
- **Environment Configuration**: `.env` file support for connection settings and credentials
- **Remote Deployment**: `make deploy` now deploys to remote Steam Deck via SSH/SCP
- **CEF Debugging Integration**: Remote debugging support via Chrome DevTools at `http://steamdeck:8081`
- **Development Scripts**: Helper scripts for CEF debugging and deployment verification
- **Comprehensive Documentation**: CLAUDE.md with detailed remote development workflow
- **SSH Authentication**: Support for both password and SSH key authentication
- **Backup System**: Automatic backup creation before deployment (configurable)
- **Connection Verification**: Pre-flight checks for network connectivity and SSH access
- **Enhanced Makefile**: New targets `debug-cef` and `verify-full` for development workflow

### Changed
- **Deployment Architecture**: Replaced local deployment with remote Steam Deck deployment
- **Development Workflow**: Streamlined for remote PC to Steam Deck development
- **Configuration Management**: Environment-based configuration for deployment settings

### Improved
- **Developer Experience**: One-command deployment with automatic debugging setup
- **Error Handling**: Better error messages and connection diagnostics
- **Documentation**: Comprehensive setup and troubleshooting guides
- **Verification Tools**: Automated deployment verification and health checks

## [1.0.0] - 2024-10-29

### Added
- **Decky Plugin Integration**: Complete GUI interface for charge scheduler configuration
- **Dual Installation Options**: Choose between standalone script or Decky plugin
- **External Configuration File**: `charge-scheduler.conf` for easier configuration management
- **Enhanced Bash Script**: Modified to source external configuration file
- **New CLI Commands**: Added `config` and `reload` commands to the bash script
- **Python Backend**: Comprehensive backend with configuration management functions
- **React Frontend**: Modern GUI with status display, configuration controls, and log viewer
- **Preset Configurations**: Quick setup modes (Gaming, Daily Use, Battery Health, Always Full)
- **Real-time Status Display**: Current charge limits and next scheduled changes
- **Manual Control Interface**: Immediate charge limit setting via GUI
- **Log Viewer**: Built-in log monitoring with refresh capability
- **Build Automation**: Makefile with build, deploy, and verification commands
- **TypeScript Integration**: Type-safe frontend development
- **Error Handling**: Comprehensive error handling and user feedback

### Changed
- **Architecture**: Transformed from standalone script to hybrid plugin/script solution
- **Configuration Management**: Moved from inline script variables to external config file
- **User Interface**: Added GUI option while maintaining CLI compatibility
- **Documentation**: Comprehensive rewrite with dual installation options
- **Project Structure**: Added full Decky plugin structure with TypeScript, React, and Python components

### Improved
- **User Experience**: Much easier configuration through GUI interface
- **Reliability**: Maintains proven bash script backend while adding convenience features
- **Monitoring**: Better visibility into scheduler operation through status and logs
- **Flexibility**: Multiple preset configurations for different use cases
- **Development**: Professional build pipeline with automated deployment

### Technical Details
- **Backend**: Python with asyncio for Decky plugin communication
- **Frontend**: React with TypeScript, using @decky/ui components
- **Build System**: Rollup with TypeScript compilation
- **Integration**: D-Bus API communication with SteamOS Manager
- **Persistence**: systemd timer for reliable background operation

## [0.3.0] - 2024-10-28

### Added
- Standalone bash script implementation
- systemd timer integration
- External configuration file support
- Comprehensive logging system
- Multiple operating modes (schedule, always_full, always_limit)

### Changed
- Replaced complex Decky plugin with simple bash script approach
- Simplified installation and configuration process
- Improved reliability through standard Linux system integration

## [0.2.0] - 2024-10-XX

### Added
- Decky plugin frontend with dropdown interface
- Event propagation fixes
- UI positioning improvements

### Fixed
- Dropdown positioning with display: contents
- Event handling issues

## [0.1.0] - 2024-10-XX

### Added
- Initial Decky plugin template implementation
- Basic charge scheduling functionality
- Plugin metadata and structure

---

## Migration Guide

### From 0.3.x (Standalone Script) to 1.0.0 (Plugin)
- Existing systemd timer continues to work
- Deploy plugin using `make deploy`
- Restart Decky Loader to load GUI
- Configure through plugin interface instead of editing files

### From 0.2.x (Old Plugin) to 1.0.0 (New Plugin)
- Disable old plugin in Decky Loader
- Remove old plugin files
- Install new version using `make full-setup`
- Configure using new GUI interface

### From Other Solutions to 1.0.0
- Disable existing charge management tools
- Follow installation instructions for either plugin or script mode
- Configure preferred schedule through GUI or config file