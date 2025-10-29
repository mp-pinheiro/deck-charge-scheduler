# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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