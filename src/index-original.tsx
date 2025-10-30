import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  DropdownItem,
  SliderField,
  showContextMenu,
  showModal,
  staticClasses
} from "@decky/ui";
import {
  definePlugin,
  callable,
  addEventListener,
  removeEventListener
} from "@decky/api";
import { FaBatteryFull, FaBatteryThreeQuarters, FaCog, FaSync } from "react-icons/fa";
import { useState, useEffect, VFC } from "react";
import { FaBolt } from "react-icons/fa";

// API callable functions
const get_config = callable<any[], any>("get_config");
const set_config = callable<any[], any>("set_config");
const set_limit_immediate = callable<any[], any>("set_limit_immediate");
const get_status = callable<any[], any>("get_status");
const get_logs = callable<any[], any>("get_logs");
const apply_schedule_now = callable<any[], any>("apply_schedule_now");

// Main content component
const Content: VFC = () => {
  const [config, setConfig] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [immediateLimit, setImmediateLimit] = useState(80);

  // Load initial data
  useEffect(() => {
    loadConfig();
    loadStatus();
    loadLogs();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await get_config();
      setConfig(result);
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  };

  const loadStatus = async () => {
    try {
      const result = await get_status();
      setStatus(result);
    } catch (error) {
      console.error("Failed to load status:", error);
    }
  };

  const loadLogs = async () => {
    try {
      const result = await get_logs(20);
      setLogs(result || []);
    } catch (error) {
      console.error("Failed to load logs:", error);
    }
  };

  const saveConfig = async (newConfig: any) => {
    setLoading(true);
    try {
      const description = generateScheduleDescription(newConfig);
      const result = await set_config(
        newConfig.MODE,
        newConfig.START_HOUR,
        newConfig.START_MINUTE,
        newConfig.DURATION_MINUTES,
        newConfig.CHARGE_LIMIT,
        description
      );

      if (result.success) {
        setConfig(newConfig);
        loadStatus(); // Refresh status
        showModal(
          <div style={{ padding: "20px" }}>
            <h3>Configuration Saved</h3>
            <p>Your charge scheduler settings have been updated successfully.</p>
            <button onClick={() => (window as any).SteamClient.DismissModal()}>Close</button>
          </div>
        );
      } else {
        showModal(
          <div style={{ padding: "20px" }}>
            <h3>Error</h3>
            <p>Failed to save configuration: {result.error}</p>
            <button onClick={() => (window as any).SteamClient.DismissModal()}>Close</button>
          </div>
        );
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      showModal(
        <div style={{ padding: "20px" }}>
          <h3>Error</h3>
          <p>Failed to save configuration: {String(error)}</p>
          <button onClick={() => (window as any).SteamClient.DismissModal()}>Close</button>
        </div>
      );
    } finally {
      setLoading(false);
    }
  };

  const setImmediateChargeLimit = async (limit: number) => {
    setLoading(true);
    try {
      const result = await set_limit_immediate(limit);
      if (result.success) {
        loadStatus();
        loadLogs();
        showModal(
          <div style={{ padding: "20px" }}>
            <h3>Charge Limit Set</h3>
            <p>Charge limit has been set to {limit}%</p>
            <button onClick={() => (window as any).SteamClient.DismissModal()}>Close</button>
          </div>
        );
      } else {
        showModal(
          <div style={{ padding: "20px" }}>
            <h3>Error</h3>
            <p>Failed to set charge limit: {result.error}</p>
            <button onClick={() => (window as any).SteamClient.DismissModal()}>Close</button>
          </div>
        );
      }
    } catch (error) {
      console.error("Failed to set charge limit:", error);
      showModal(
        <div style={{ padding: "20px" }}>
          <h3>Error</h3>
          <p>Failed to set charge limit: {String(error)}</p>
          <button onClick={() => (window as any).SteamClient.DismissModal()}>Close</button>
        </div>
      );
    } finally {
      setLoading(false);
    }
  };

  const applyScheduleNow = async () => {
    setLoading(true);
    try {
      const result = await apply_schedule_now();
      if (result.success) {
        loadStatus();
        loadLogs();
        showModal(
          <div style={{ padding: "20px" }}>
            <h3>Schedule Applied</h3>
            <p>Your charge schedule has been applied immediately.</p>
            <button onClick={() => (window as any).SteamClient.DismissModal()}>Close</button>
          </div>
        );
      } else {
        showModal(
          <div style={{ padding: "20px" }}>
            <h3>Error</h3>
            <p>Failed to apply schedule: {result.error}</p>
            <button onClick={() => (window as any).SteamClient.DismissModal()}>Close</button>
          </div>
        );
      }
    } catch (error) {
      console.error("Failed to apply schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateScheduleDescription = (cfg: any) => {
    if (cfg.MODE === "always_full") return "Always charging to 100%";
    if (cfg.MODE === "always_limit") return `Always limited to ${cfg.CHARGE_LIMIT}%`;

    const startTime = `${cfg.START_HOUR.toString().padStart(2, '0')}:${cfg.START_MINUTE.toString().padStart(2, '0')}`;
    const endTime = `${(cfg.START_HOUR + Math.floor((cfg.START_MINUTE + cfg.DURATION_MINUTES) / 60) % 24).toString().padStart(2, '0')}:${((cfg.START_MINUTE + cfg.DURATION_MINUTES) % 60).toString().padStart(2, '0')}`;
    return `${startTime} - ${endTime}: 100%, rest of day: ${cfg.CHARGE_LIMIT}%`;
  };

  const showLogViewer = () => {
    showModal(
      <div style={{ padding: "20px", maxWidth: "600px", maxHeight: "400px", overflow: "auto" }}>
        <h3>Charge Scheduler Logs</h3>
        <div style={{
          backgroundColor: "#1a1a1a",
          padding: "10px",
          borderRadius: "8px",
          fontFamily: "monospace",
          fontSize: "12px",
          maxHeight: "300px",
          overflow: "auto",
          whiteSpace: "pre-wrap"
        }}>
          {logs.length > 0 ? logs.join('\n') : "No logs available"}
        </div>
        <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
          <button onClick={() => { loadLogs(); (window as any).SteamClient.DismissModal(); }}>
            <FaSync /> Refresh
          </button>
          <button onClick={() => (window as any).SteamClient.DismissModal()}>Close</button>
        </div>
      </div>
    );
  };

  const showPresetMenu = () => {
    showContextMenu(
      <div>
        <div onClick={() => saveConfig({
          MODE: "schedule",
          START_HOUR: 20,
          START_MINUTE: 0,
          DURATION_MINUTES: 120,
          CHARGE_LIMIT: 100
        })}>Gaming Mode</div>
        <div onClick={() => saveConfig({
          MODE: "schedule",
          START_HOUR: 8,
          START_MINUTE: 0,
          DURATION_MINUTES: 60,
          CHARGE_LIMIT: 80
        })}>Daily Use</div>
        <div onClick={() => saveConfig({
          MODE: "always_limit",
          START_HOUR: 0,
          START_MINUTE: 0,
          DURATION_MINUTES: 0,
          CHARGE_LIMIT: 60
        })}>Battery Health</div>
        <div onClick={() => saveConfig({
          MODE: "always_full",
          START_HOUR: 0,
          START_MINUTE: 0,
          DURATION_MINUTES: 0,
          CHARGE_LIMIT: 100
        })}>Always Full</div>
      </div>
    );
  };

  return (
    <div style={{ padding: "15px" }}>
      {/* Status Section */}
      <PanelSection title="Status">
        {status && (
          <>
            <PanelSectionRow>
              <div style={{ padding: "15px", backgroundColor: "#2a2a2a", borderRadius: "8px", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                  <FaBatteryFull style={{ marginRight: "10px", color: "#4CAF50", fontSize: "18px" }} />
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>Current Charge Cap: {status.current_limit || "Unknown"}</div>
                    <div style={{ fontSize: "12px", color: "#ccc" }}>Current status: {status.next_change || "Calculating..."}</div>
                  </div>
                </div>
              </div>
            </PanelSectionRow>

            <PanelSectionRow>
              <ButtonItem
                layout="below"
                onClick={applyScheduleNow}
                disabled={loading}
              >
                <FaSync /> {loading ? "Applying..." : "Apply Schedule Now"}
              </ButtonItem>
            </PanelSectionRow>

            <PanelSectionRow>
              <ButtonItem
                layout="below"
                onClick={showLogViewer}
              >
                <FaCog /> View Logs
              </ButtonItem>
            </PanelSectionRow>
          </>
        )}
      </PanelSection>

      {/* Configuration Section */}
      <PanelSection title="Configuration">
        {config && (
          <>
            {/* Mode Selection */}
            <PanelSectionRow>
              <div style={{ padding: "10px", backgroundColor: "#1a1a1a", borderRadius: "8px", marginBottom: "10px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "14px" }}>🧩 Mode</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="mode"
                      checked={config.MODE === "schedule"}
                      onChange={() => saveConfig({ ...config, MODE: "schedule" })}
                      style={{ marginRight: "8px" }}
                    />
                    <span>(●) Follow Schedule</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="mode"
                      checked={config.MODE === "always_full"}
                      onChange={() => saveConfig({ ...config, MODE: "always_full" })}
                      style={{ marginRight: "8px" }}
                    />
                    <span>(○) Always Full Power</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="mode"
                      checked={config.MODE === "always_limit"}
                      onChange={() => saveConfig({ ...config, MODE: "always_limit" })}
                      style={{ marginRight: "8px" }}
                    />
                    <span>(○) Always Limit to {config.CHARGE_LIMIT || 80}%</span>
                  </label>
                </div>
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#4CAF50" }}>
                  [ ✅ Changes auto-saved ]
                </div>
              </div>
            </PanelSectionRow>

            {/* Schedule Configuration (only for schedule mode) */}
            {config.MODE === "schedule" && (
              <div style={{ padding: "10px", backgroundColor: "#1a1a1a", borderRadius: "8px", marginBottom: "10px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "14px" }}>⏰ Schedule</div>
                <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "#ccc", marginBottom: "4px" }}>Start time:</div>
                    <DropdownItem
                      rgOptions={Array.from({ length: 24 }, (_, i) => ({
                        data: i,
                        label: `${i.toString().padStart(2, '0')}:00`
                      }))}
                      selectedOption={config.START_HOUR || 8}
                      onChange={(mode: any) => saveConfig({ ...config, START_HOUR: mode.data })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "#ccc", marginBottom: "4px" }}>Duration:</div>
                    <DropdownItem
                      rgOptions={[
                        { data: 15, label: "15m" },
                        { data: 30, label: "30m" },
                        { data: 60, label: "1h" },
                        { data: 120, label: "2h" },
                        { data: 240, label: "4h" }
                      ]}
                      selectedOption={config.DURATION_MINUTES || 60}
                      onChange={(mode: any) => saveConfig({ ...config, DURATION_MINUTES: mode.data })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Charge Limit (for schedule and always_limit modes) */}
            {config.MODE !== "always_full" && (
              <div style={{ padding: "10px", backgroundColor: "#1a1a1a", borderRadius: "8px", marginBottom: "10px" }}>
                <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "14px" }}>
                  🔋 Charge Limit (outside schedule)
                </div>
                <div style={{ marginBottom: "8px", fontSize: "12px", color: "#ccc" }}>
                  {config.CHARGE_LIMIT || 80}% ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ 95%
                </div>
                <SliderField
                  value={config.CHARGE_LIMIT || 80}
                  step={5}
                  min={50}
                  max={100}
                  showValue={true}
                  onChange={(value: number) => saveConfig({ ...config, CHARGE_LIMIT: value })}
                />
              </div>
            )}

            {/* Preset Configurations */}
            <PanelSectionRow>
              <ButtonItem
                layout="below"
                onClick={showPresetMenu}
                disabled={loading}
              >
                <FaBolt /> Preset Configurations
              </ButtonItem>
            </PanelSectionRow>
          </>
        )}
      </PanelSection>

      {/* Manual Control Section */}
      <PanelSection title="Manual Control">
        <PanelSectionRow>
          <SliderField
            label="Immediate Charge Limit"
            value={immediateLimit}
            step={5}
            min={50}
            max={100}
            showValue={true}
            onChange={(value: number) => setImmediateLimit(value)}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem
            layout="below"
            onClick={() => setImmediateChargeLimit(immediateLimit)}
            disabled={loading}
          >
            <FaBatteryThreeQuarters /> Set Limit to {immediateLimit}%
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
};

export default definePlugin(() => {
  console.log("Deck Charge Scheduler Plugin initializing");

  // Plugin-level setup (event listeners, etc.)
  const listener = addEventListener("some_event", (data) => {
    // Handle events if needed
    console.log("Plugin event received:", data);
  });

  return {
    name: "Deck Charge Scheduler",
    titleView: <div className={staticClasses.Title}>Charge Scheduler</div>,
    content: <Content />,
    icon: <FaBatteryFull />,

    // Lifecycle methods
    onDismount() {
      console.log("Unloading Deck Charge Scheduler plugin");
      removeEventListener("some_event", listener);
    },
  };
});