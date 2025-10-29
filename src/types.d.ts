// Type declarations for Decky API and Steam Deck environment

declare global {
  interface Window {
    SP_REACT: any;
    SteamClient: {
      DismissModal: () => void;
    };
  }
}

// TypeScript interface for Decky API
declare module "@decky/api" {
  export const definePlugin: (pluginFactory: () => any) => any;
  export const callable: <T extends any[], R>(methodName: string) => (...args: T) => Promise<R>;
  export const addEventListener: (event: string, callback: (data: any) => void) => any;
  export const removeEventListener: (event: string, listener: any) => void;
}

// TypeScript interface for Decky UI components
declare module "@decky/ui" {
  export const PanelSection: any;
  export const PanelSectionRow: any;
  export const ButtonItem: any;
  export const DropdownItem: any;
  export const SliderField: any;
  export const TextField: any;
  export const showContextMenu: (content: any) => void;
  export const showModal: (content: any) => void;
  export const staticClasses: {
    Title: string;
  };
}

declare module "*";