import {
  definePlugin,
  addEventListener,
  removeEventListener,
  callable
} from "@decky/api";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  DropdownItem,
  SliderField,
  staticClasses
} from "@decky/ui";
import { FaBolt } from "react-icons/fa";
import { useState, useEffect } from "react";

// Type definitions for our configuration
interface ChargeConfig {
  mode: "schedule" | "always_full" | "always_limit";
  start_hour: number;
  start_minute: number;
  duration_minutes: number;
  charge_limit: number;
}

interface ChargeStatus {
  current_limit: string;
  next_change: string;
  config: any;
  script_path: string;
  config_file_exists: boolean;
}

// API callable functions using exact working pattern from template
const get_config = callable<any[], any>("get_config");
const set_config = callable<[mode: string, start_hour: number, start_minute: number, duration_minutes: number, charge_limit: number, description: string], any>("set_config");
const get_status = callable<any[], any>("get_status");
const apply_schedule_now = callable<any[], any>("apply_schedule_now");

// Global state to persist across re-renders
let globalConfig: ChargeConfig = {
  mode: "schedule",
  start_hour: 8,
  start_minute: 0,
  duration_minutes: 60,
  charge_limit: 80
};

function Content() {
  const [config, setConfig] = useState<ChargeConfig>(globalConfig);
  const [status, setStatus] = useState<ChargeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyingSchedule, setApplyingSchedule] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  console.log("Content rendering with config:", config);

  // Load configuration on mount and set up polling
  useEffect(() => {
    console.log("Content mounted, loading initial data");
    loadConfig();
    loadStatus();

    // Set up status polling every 5 seconds
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      console.log("Loading config from backend...");
      const result = await get_config();
      console.log("Config loaded:", result);

      if (result && !result.error) {
        const newConfig = {
          mode: result.MODE || "schedule",
          start_hour: result.START_HOUR || 8,
          start_minute: result.START_MINUTE || 0,
          duration_minutes: result.DURATION_MINUTES || 60,
          charge_limit: result.CHARGE_LIMIT || 80
        };

        globalConfig = newConfig; // Update global state
        setConfig(newConfig);
        console.log("Config updated to:", newConfig);
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  };

  const loadStatus = async () => {
    try {
      const result = await get_status();
      console.log("Status loaded:", result);

      if (result && !result.error) {
        setStatus(result);
        setLastUpdate(new Date());
      } else {
        console.warn("Status error:", result?.error);
      }
    } catch (error) {
      console.error("Failed to load status:", error);
    }
  };

  const updateConfig = async (updates: Partial<ChargeConfig>) => {
    setLoading(true);
    try {
      const newConfig = { ...config, ...updates };
      console.log("Updating config:", newConfig);

      const result = await set_config(
        newConfig.mode,
        newConfig.start_hour,
        newConfig.start_minute,
        newConfig.duration_minutes,
        newConfig.charge_limit,
        `Schedule: ${newConfig.start_hour}:${newConfig.start_minute.toString().padStart(2, '0')} for ${newConfig.duration_minutes} minutes`
      );

      console.log("Config update result:", result);

      if (result && result.success) {
        globalConfig = newConfig; // Update global state
        setConfig(newConfig);
        await loadStatus(); // Refresh status after config change

        console.log("Configuration saved successfully");
      } else {
        console.error("Failed to save configuration:", result?.error);
      }
    } catch (error) {
      console.error("Failed to update config:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyScheduleNow = async () => {
    setApplyingSchedule(true);
    try {
      console.log("Applying schedule now...");
      const result = await apply_schedule_now();
      console.log("Apply schedule result:", result);

      if (result && result.success) {
        await loadStatus(); // Refresh status
        console.log("Schedule applied successfully!");
      } else {
        console.error("Failed to apply schedule:", result?.error);
      }
    } catch (error) {
      console.error("Failed to apply schedule:", error);
    } finally {
      setApplyingSchedule(false);
    }
  };

  // Time options for dropdown (every 30 minutes)
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    return {
      data: `${hour}:${minute}`,
      label: timeStr
    };
  });

  // Duration options
  const durationOptions = [
    { data: 30, label: "30 minutes" },
    { data: 60, label: "1 hour" },
    { data: 90, label: "1.5 hours" },
    { data: 120, label: "2 hours" },
    { data: 180, label: "3 hours" },
    { data: 240, label: "4 hours" }
  ];

  // Mode options - FIXED: "always_limit" not "always_limited"
  const modeOptions = [
    { data: "schedule", label: "Follow Schedule" },
    { data: "always_full", label: "Always Full Power" },
    { data: "always_limit", label: "Always Limit to 80%" }
  ];

  const onModeChange = (option: any) => {
    console.log("=== MODE CHANGE START ===");
    console.log("Mode changing from", config.mode, "to", option.data);
    console.log("Option object:", option);
    updateConfig({ mode: option.data });
    console.log("=== MODE CHANGE END ===");
  };

  const onTimeChange = (option: any) => {
    console.log("=== TIME CHANGE START ===");
    console.log("Time changing from", `${config.start_hour}:${config.start_minute}`, "to", option.data);
    const [hour, minute] = option.data.split(":").map(Number);
    updateConfig({ start_hour: hour, start_minute: minute });
    console.log("=== TIME CHANGE END ===");
  };

  const onDurationChange = (option: any) => {
    console.log("=== DURATION CHANGE START ===");
    console.log("Duration changing from", config.duration_minutes, "to", option.data);
    updateConfig({ duration_minutes: option.data });
    console.log("=== DURATION CHANGE END ===");
  };

  const onSliderChange = (value: number) => {
    console.log("=== SLIDER CHANGE START ===");
    console.log("Charge limit changing from", config.charge_limit, "to", value);
    updateConfig({ charge_limit: value });
    console.log("=== SLIDER CHANGE END ===");
  };

  return (
    <div>
      {/* Status Section */}
      <PanelSection title="Status">
        <PanelSectionRow>
          <div style={{ display: "flex", alignItems: "center", padding: "10px 0" }}>
            <FaBolt style={{ marginRight: "8px", color: "#4a9eff" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold" }}>
                {status?.next_change || "Loading status..."}
              </div>
              <div style={{ fontSize: "12px", color: "#999" }}>
                Current limit: {status?.current_limit || "Unknown"}
                {lastUpdate && (
                  <span style={{ marginLeft: "10px", fontSize: "10px" }}>
                    (Updated: {lastUpdate.toLocaleTimeString()})
                  </span>
                )}
              </div>
            </div>
          </div>
        </PanelSectionRow>
      </PanelSection>

      {/* Mode Selection */}
      <PanelSection title="Operation Mode">
        <PanelSectionRow>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: "contents" }}
          >
            <DropdownItem
              label="Mode"
              description={`Currently: ${config.mode}`}
              rgOptions={modeOptions}
              selectedOption={config.mode}
              onChange={onModeChange}
            />
          </div>
        </PanelSectionRow>
      </PanelSection>

      {/* Schedule Configuration */}
      {config.mode === "schedule" && (
        <PanelSection title="Schedule Configuration">
          <PanelSectionRow>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ display: "contents" }}
            >
              <DropdownItem
                label="Start Time"
                description={`Currently: ${config.start_hour}:${config.start_minute.toString().padStart(2, '0')}`}
                rgOptions={timeOptions}
                selectedOption={`${config.start_hour}:${config.start_minute}`}
                onChange={onTimeChange}
              />
            </div>
          </PanelSectionRow>

          <PanelSectionRow>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ display: "contents" }}
            >
              <DropdownItem
                label="Duration"
                description={`Currently: ${config.duration_minutes} minutes`}
                rgOptions={durationOptions}
                selectedOption={config.duration_minutes}
                onChange={onDurationChange}
              />
            </div>
          </PanelSectionRow>

          <PanelSectionRow>
            <ButtonItem
              layout="below"
              onClick={applyScheduleNow}
              disabled={applyingSchedule || loading}
            >
              {applyingSchedule ? "Applying..." : "Apply Schedule Now"}
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      )}

      {/* Charge Limit Configuration */}
      {config.mode !== "always_full" && (
        <PanelSection title="Charge Limit">
          <PanelSectionRow>
            <SliderField
              label="Maximum Charge"
              value={config.charge_limit}
              min={50}  // FIXED: Match backend validation range
              max={100} // FIXED: Match backend validation range
              step={5}
              showValue={true}
              onChange={onSliderChange}
              disabled={loading}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <div style={{ fontSize: "12px", color: "#999", textAlign: "center" }}>
              {config.mode === "always_limit"
                ? "Always limit charge to preserve battery health"
                : "Limit charge when not following schedule"
              }
            </div>
          </PanelSectionRow>
        </PanelSection>
      )}

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <PanelSection title="Debug Information">
          <PanelSectionRow>
            <div style={{ fontSize: "12px", fontFamily: "monospace" }}>
              <div>Mode: {config.mode}</div>
              <div>Time: {config.start_hour}:{config.start_minute}</div>
              <div>Duration: {config.duration_minutes} min</div>
              <div>Limit: {config.charge_limit}%</div>
              <div>Loading: {loading ? "Yes" : "No"}</div>
              <div>Status: {status ? "Loaded" : "Not loaded"}</div>
            </div>
          </PanelSectionRow>
        </PanelSection>
      )}

      {/* Information */}
      <PanelSection title="Information">
        <PanelSectionRow>
          <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
            <strong>Smart Charge Scheduler</strong><br />
            Manage your Steam Deck's battery charging to prolong battery health.
            Set schedules for when charging should be limited, or use always-on modes.
          </div>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
}

export default definePlugin(() => {
  console.log("Smart Charge Scheduler plugin initializing");

  // Add event listeners here if needed
  const listener = addEventListener("timer_event", () => {
    console.log("Timer event received");
  });

  return {
    name: "Smart Charge Scheduler",
    titleView: (
      <div className={staticClasses.Title}>
        <FaBolt style={{ marginRight: "8px" }} />
        Smart Charge Scheduler
      </div>
    ),
    content: <Content />,
    icon: <FaBolt />,

    onDismount() {
      console.log("Smart Charge Scheduler plugin unloaded");
      removeEventListener("timer_event", listener);
    },
  };
});