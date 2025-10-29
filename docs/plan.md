# Smart Charge Scheduler - Hybrid Architecture Plan

## Executive Summary
Transform the current test UI into a production-ready Decky plugin that wraps the robust bash script core. The Python backend is well-structured and ready - we need to build the React frontend interface that provides user-friendly control over the charge scheduling system.

## Current State Analysis

### ✅ Solid Foundation (Already Complete)
- **Bash Script Core**: `charge-scheduler.sh` (202 lines) with full SteamOS D-Bus integration
- **Python Backend**: `main.py` with proper Decky plugin architecture, error handling, logging
- **Configuration**: External `charge-scheduler.conf` file with validation
- **Systemd Integration**: Background timer for automated operation
- **CLI Interface**: Manual control capabilities

### ❌ Current Gap
- **Frontend**: `src/index.tsx` contains only test components, no production UI

## Target UI Mockup
```
[ ⚡ Smart Charge Scheduler ]

Current status: Full Power (until 09:00)
Current charge cap: 100%

⏰ Schedule
[ Start time: 08:00 ▼ ] [ Duration: 1h ▼ ]

🔋 Charge Limit (outside schedule)
[ 80% ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ 95% ]

🧩 Mode
(●) Follow Schedule
(○) Always Full Power
(○) Always Limit to 80%

[ ✅ Changes auto-saved ]
```

## Technical Architecture

### Hybrid Approach Overview
```
React UI Frontend ←→ Python Backend ←→ Bash Script Core ←→ SteamOS D-Bus API
```

### Component Responsibilities
- **React UI**: User interface, real-time display, user input handling
- **Python Backend**: Plugin lifecycle, configuration management, script execution
- **Bash Script**: SteamOS integration, charge control, systemd management
- **SteamOS D-Bus**: Hardware-level battery charge control

## Implementation Plan

### Phase 1: Frontend Development

#### 1.1 Component Architecture
```
src/
├── index.tsx (main plugin container)
├── components/
│   ├── StatusPanel.tsx          # Current status + charge cap
│   ├── SchedulePanel.tsx        # Time pickers for schedule
│   ├── ChargeLimitSlider.tsx    # Visual slider (80-95%)
│   ├── ModeSelector.tsx         # Radio button group
│   └── AutoSaveIndicator.tsx    # Auto-save confirmation
├── hooks/
│   ├── useChargeStatus.ts       # Real-time status polling
│   ├── useConfiguration.ts      # Config management
│   └── useSchedule.ts           # Schedule logic
├── types/
│   ├── config.ts                # Configuration interfaces
│   ├── status.ts                # Status data structures
│   └── schedule.ts              # Schedule types
└── utils/
    ├── timeHelpers.ts           # Time formatting utilities
    └── validation.ts            # Input validation
```

#### 1.2 Component Specifications

**StatusPanel Component**
- Display current mode status text
- Show current charge cap percentage
- Real-time updates every 5 seconds
- Visual indicators for active/inactive states

**SchedulePanel Component**
- Start time dropdown (00:00 - 23:30, 30min intervals)
- Duration dropdown (30min, 1h, 2h, 3h, 4h)
- Clear display of current schedule
- Integration with schedule hooks

**ChargeLimitSlider Component**
- Visual slider control (80% - 95% range)
- Real-time value display
- Smooth transitions and feedback
- Percentage indicator with visual fill

**ModeSelector Component**
- Radio button group for 3 modes:
  - Follow Schedule
  - Always Full Power
  - Always Limit to 80%
- Clear visual selection indicator
- Immediate mode switching

**AutoSaveIndicator Component**
- Non-intrusive save confirmation
- Fade-in/fade-out animations
- Error/success state indicators
- Auto-hide after 3 seconds

### Phase 2: Backend Integration

#### 2.1 Python Backend Method Mapping
```python
# Existing methods that frontend will call:

get_config() -> Load current configuration
set_config(config: dict) -> Save user changes
set_limit_immediate(limit: int) -> Quick charge limit change
get_status() -> Current system status
get_logs() -> Debug information
apply_schedule_now() -> Manual schedule trigger
```

#### 2.2 Data Flow Architecture

**Configuration Flow:**
```
User Input → React Component → useConfiguration Hook →
Python set_config() → .conf file → Bash Script → SteamOS
```

**Status Monitoring Flow:**
```
SteamOS → Bash Script → Log Files → Python get_status() →
useChargeStatus Hook → React UI Updates
```

**Real-time Updates:**
- Poll every 5 seconds for status changes
- WebSocket-like updates for configuration changes
- Immediate updates for manual user actions

### Phase 3: Enhanced Features

#### 3.1 Configuration Management
- **Auto-save**: Every change immediately saved to `.conf`
- **Validation**: Ensure time ranges, percentage limits are valid
- **Error Recovery**: Graceful handling of invalid inputs
- **Persistence**: Settings survive plugin reloads

#### 3.2 Schedule Logic
- **Time Calculations**: Next scheduled change countdown
- **Schedule Preview**: Show "Full Power (until 09:00)" style text
- **Manual Override**: "Apply Schedule Now" functionality
- **Conflict Resolution**: Handle overlapping modes

#### 3.3 Status Monitoring
- **Charge Level**: Current battery percentage
- **Charge Limit**: Current cap being applied
- **Mode Status**: Active operation mode
- **Schedule Timer**: Time until next change

### Phase 4: User Experience Polish

#### 4.1 Visual Design
- **Steam Deck Theme**: Consistent with SteamOS styling
- **Responsive Layout**: Adapts to different screen sizes
- **Loading States**: Smooth transitions and spinners
- **Error Handling**: User-friendly error messages

#### 4.2 Interactions
- **Immediate Feedback**: Every change shows instant response
- **Auto-save Behavior**: "Changes auto-saved" confirmation
- **Keyboard Navigation**: Full keyboard accessibility
- **Touch Support**: Optimized for Steam Deck touchscreen

## Development Guidelines

### Code Standards
- **TypeScript**: Strict typing for all components
- **React Hooks**: Custom hooks for complex state logic
- **Error Boundaries**: Graceful error handling
- **Performance**: Memoization and optimization

### Testing Strategy
- **Unit Tests**: Component logic validation
- **Integration Tests**: Frontend-backend communication
- **User Testing**: Complete workflow validation
- **Edge Cases**: Error conditions and boundary cases

### Decky Plugin Best Practices
- **Lifecycle Management**: Proper mount/unmount handling
- **Memory Management**: Prevent memory leaks
- **Plugin API**: Proper use of @decky.callable methods
- **Logging**: Integration with Decky logger system

## Files to Create/Modify

### New Files
```
src/components/StatusPanel.tsx
src/components/SchedulePanel.tsx
src/components/ChargeLimitSlider.tsx
src/components/ModeSelector.tsx
src/components/AutoSaveIndicator.tsx
src/hooks/useChargeStatus.ts
src/hooks/useConfiguration.ts
src/hooks/useSchedule.ts
src/types/config.ts
src/types/status.ts
src/types/schedule.ts
src/utils/timeHelpers.ts
src/utils/validation.ts
```

### Modified Files
```
src/index.tsx (complete rewrite)
plugin.json (version update)
README.md (architecture documentation)
```

### Unchanged Files (Solid Foundation)
```
main.py (Python backend)
charge-scheduler.sh (bash script core)
charge-scheduler.conf (configuration file)
```

## Success Metrics

### Functional Requirements
- ✅ Load and display current configuration accurately
- ✅ Update configuration with immediate visual feedback
- ✅ Real-time status monitoring with 5-second updates
- ✅ Schedule management with time picker interface
- ✅ Manual charge limit control with visual slider
- ✅ Mode switching with persistent state
- ✅ Error handling with user-friendly messages

### Performance Requirements
- ✅ UI response time < 100ms for user interactions
- ✅ Status update latency < 5 seconds
- ✅ Memory usage < 10MB for plugin
- ✅ Plugin load time < 2 seconds

### User Experience Requirements
- ✅ Intuitive interface matching provided mockup
- ✅ Clear visual feedback for all actions
- ✅ Graceful handling of error conditions
- ✅ Consistent with Steam Deck UI patterns

## Future Enhancement Opportunities

### Advanced Features
- **Analytics**: Charge pattern tracking and optimization
- **Smart Suggestions**: AI-driven schedule recommendations
- **Battery Health**: Long-term battery degradation monitoring
- **Multiple Profiles**: Different settings for different use cases

### Integration Opportunities
- **Steam Integration**: Game-aware charge management
- **External Control**: API for third-party automation
- **Cloud Sync**: Settings synchronization across devices
- **Mobile App**: Remote control via smartphone

## Conclusion

This hybrid architecture leverages the existing robust foundation while providing a modern, user-friendly interface. The modular design ensures maintainability while allowing for future enhancements. The separation of concerns (UI → Backend → Script → OS) provides a clean, scalable architecture that follows both Decky plugin best practices and software engineering principles.

The implementation will transform the current test UI into a production-ready plugin that delivers the exact experience shown in the mockup while maintaining the reliability and performance of the existing bash script core.