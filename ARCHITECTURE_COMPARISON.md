# Architecture Comparison: Current Plugin vs DeckSP

## Overview
This document compares the architecture of this plugin with the DeckSP plugin (https://github.com/jessebofill/DeckSP/tree/main) and documents the minimal dropdown implementation.

## Architecture Comparison

### Current Plugin (deck-charge-scheduler)
**Structure:** Simple, flat architecture
```
src/
├── index.tsx          # Main plugin file with all logic
└── types.d.ts         # Type definitions
```

**Characteristics:**
- **Simplicity**: Single file contains all UI logic
- **Direct approach**: Uses @decky/ui components directly
- **Minimal abstraction**: No custom wrapper components
- **Template-based**: Based on the standard Decky plugin template
- **Suitable for**: Simple plugins with limited functionality

### DeckSP Plugin
**Structure:** Sophisticated, layered architecture
```
src/
├── components/        # UI components organized by purpose
│   ├── dataProviders/ # Context providers for state management
│   ├── dspParamControls/ # Specialized parameter controls
│   ├── generic/       # Reusable generic components
│   ├── native/        # Native UI integrations
│   ├── profile/       # Profile management components
│   ├── qam/           # Quick Access Menu components
│   └── waitable/      # Async loading components
├── controllers/       # Business logic and API management
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
├── defines/          # Constants and configuration
└── lib/              # Utility functions
```

**Characteristics:**
- **Modularity**: Clear separation of concerns
- **Reusability**: Custom components with extensive configuration
- **Type Safety**: Comprehensive TypeScript usage
- **State Management**: Context providers and custom hooks
- **Scalability**: Architecture supports complex feature sets
- **Abstraction**: Multiple layers of wrapper components
- **Suitable for**: Complex plugins with extensive functionality

## Key Architectural Differences

| Aspect | Current Plugin | DeckSP |
|--------|---------------|---------|
| **Complexity** | Minimal | High |
| **File Organization** | Flat | Hierarchical |
| **Component Reusability** | Low | High |
| **Type Safety** | Basic | Comprehensive |
| **State Management** | Component state only | Context + Custom hooks |
| **Customization** | Limited | Extensive |
| **Learning Curve** | Low | High |
| **Maintainability** | Good for simple plugins | Excellent for complex plugins |

## Dropdown Implementation

### Requirement
Create a minimal implementation of a dropdown list test with options A, B, and C.

### Implementation Approach
Given the current plugin's simple architecture, I implemented a minimal dropdown using the existing patterns:

1. **Used native @decky/ui components**: `DropdownItem` and `SingleDropdownOption`
2. **Added to existing structure**: Integrated into the current `Content` component
3. **Minimal state management**: Simple `useState` for selected option tracking
4. **Visual feedback**: Description shows current selection

### Code Implementation
```typescript
// State management
const [selectedOption, setSelectedOption] = useState<string>("A");

// Dropdown options
const dropdownOptions: SingleDropdownOption[] = [
  { data: "A", label: "Option A" },
  { data: "B", label: "Option B" },
  { data: "C", label: "Option C" }
];

// Event handler
const onDropdownChange = (option: SingleDropdownOption) => {
  setSelectedOption(option.data);
};

// UI Component
<DropdownItem
  label="Dropdown Test"
  description={`Currently selected: ${selectedOption}`}
  rgOptions={dropdownOptions}
  selectedOption={selectedOption}
  onChange={onDropdownChange}
/>
```

### Design Decisions

1. **Minimal Changes**: Added only necessary code to existing file
2. **Native Components**: Used @decky/ui components directly without custom wrappers
3. **Simple State**: Used basic React state instead of complex state management
4. **Clear Feedback**: Added description to show current selection
5. **Type Safety**: Proper TypeScript typing for dropdown options

### Alternative Approaches (Not Implemented)

If following DeckSP's architecture pattern, we could have:
1. Created a `components/` directory structure
2. Built a custom dropdown wrapper component
3. Implemented context providers for state management
4. Added custom hooks for dropdown logic
5. Created extensive type definitions

However, for a minimal test implementation, the simple approach aligns better with the current plugin's architecture and requirements.

## Conclusion

The current implementation provides a functional dropdown test while maintaining consistency with the existing simple architecture. For future expansion, the plugin could evolve toward DeckSP's more sophisticated patterns as complexity grows.