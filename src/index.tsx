import {
    definePlugin,
    addEventListener,
    removeEventListener,
    callable,
} from "@decky/api";
import {
    PanelSection,
    PanelSectionRow,
    ButtonItem,
    DropdownItem,
    SliderField,
    showModal,
    staticClasses
} from "@decky/ui";
import { FaBolt } from "react-icons/fa";
import { useEffect, useState, useMemo } from "react";

// -------- Types --------
interface SingleDropdownOption {
    data: any;
    label: string;
}

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
    error?: string;
}

// -------- Backend callables (working pattern) --------
const get_config = callable<any[], any>("get_config");
const set_config = callable<any[], any>("set_config");
const get_status = callable<any[], any>("get_status");
const apply_schedule_now = callable<any[], any>("apply_schedule_now");

// -------- Utils --------
const debounce = <T extends (...args: any[]) => any>(fn: T, wait: number): T => {
    let t: ReturnType<typeof setTimeout>;
    return ((...args: Parameters<T>) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    }) as T;
};

const hhmm = (h: number, m: number) =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

// -------- Global state (prevents re-mount resets) --------
let globalConfig: ChargeConfig = {
    mode: "schedule",
    start_hour: 8,
    start_minute: 0,
    duration_minutes: 60,
    charge_limit: 80,
};

function Content() {
    console.log("Content rendering with globalConfig:", globalConfig);

    const [uiConfig, setUiConfig] = useState<ChargeConfig>(globalConfig);
    const [status, setStatus] = useState<ChargeStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [limitLocal, setLimitLocal] = useState<number>(globalConfig.charge_limit);

    // Sync slider with global state
    useEffect(() => setLimitLocal(uiConfig.charge_limit), [uiConfig.charge_limit]);

    // Options (stable with useMemo)
    const modeOptions: SingleDropdownOption[] = useMemo(
        () => [
            { data: "schedule", label: "Follow Schedule" },
            { data: "always_full", label: "Always Full Power" },
            { data: "always_limit", label: "Always Limit to 80%" },
        ],
        []
    );

    const timeOptions: SingleDropdownOption[] = useMemo(() => {
        const arr: SingleDropdownOption[] = [];
        for (let i = 0; i < 48; i++) {
            const h = Math.floor(i / 2);
            const m = (i % 2) * 30;
            const s = hhmm(h, m);
            arr.push({ data: s, label: s });
        }
        return arr;
    }, []);

    const durationOptions: SingleDropdownOption[] = useMemo(
        () => [
            { data: 30, label: "30 minutes" },
            { data: 60, label: "1 hour" },
            { data: 90, label: "1.5 hours" },
            { data: 120, label: "2 hours" },
            { data: 180, label: "3 hours" },
            { data: 240, label: "4 hours" },
        ],
        []
    );

    // Eager fallback so Status never blanks
    const setFallbackStatus = (cfg: ChargeConfig) => {
        setStatus({
            current_limit: cfg.mode === "always_full" ? "100%" : `${cfg.charge_limit}%`,
            next_change:
                cfg.mode === "always_full"
                    ? "Always charging to 100%"
                    : cfg.mode === "always_limit"
                        ? `Always limited to ${cfg.charge_limit}%`
                        : "Schedule active",
            config: cfg,
            script_path: "",
            config_file_exists: false,
        });
    };

    // Initial load
    useEffect(() => {
        (async () => {
            try {
                console.log("🔄 [init] Loading config from backend...");
                const res = await get_config();
                console.log("📥 [init] Backend response:", res);

                const cfg: ChargeConfig = {
                    mode: res?.MODE ?? "schedule",
                    start_hour: res?.START_HOUR ?? 8,
                    start_minute: res?.START_MINUTE ?? 0,
                    duration_minutes: res?.DURATION_MINUTES ?? 60,
                    charge_limit: res?.CHARGE_LIMIT ?? 80,
                };

                globalConfig = cfg; // Update global state
                setUiConfig(cfg);
                setFallbackStatus(cfg);
                console.log("✅ [init] Config loaded and set:", cfg);
            } catch (e) {
                console.error("❌ [init] Failed to load config:", e);
                setFallbackStatus(uiConfig);
                showModal(
                    <div style={{ padding: 16 }}>
                        <h3>Failed to load config</h3>
                        <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{String(e)}</div>
                    </div>
                );
            }

            await loadStatus();
            const id = setInterval(loadStatus, 5000);
            return () => clearInterval(id);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadStatus = async () => {
        console.log("🔄 [loadStatus] Starting status update...");
        try {
            console.log("📡 [loadStatus] Calling get_status()...");
            const res = await get_status();
            console.log("📥 [loadStatus] get_status() response:", res);

            if (res && !res.error) {
                console.log("✅ [loadStatus] Setting valid status:", res);
                setStatus(res);
            } else {
                console.warn("⚠️ [loadStatus] Invalid response or error:", res);
                setFallbackStatus(uiConfig);
            }
        } catch (error) {
            console.error("❌ [loadStatus] Exception caught:", error);
            setFallbackStatus(uiConfig);
        } finally {
            setLastUpdate(new Date());
            console.log("🏁 [loadStatus] Status update complete");
        }
    };

    // Persist config - WORKING PATTERN
    const commitConfig = async (next: ChargeConfig) => {
        console.log("💾 [commitConfig] Starting config save:", next);
        setUiConfig(next); // optimistic
        setLoading(true);
        try {
            const desc = `Schedule: ${hhmm(next.start_hour, next.start_minute)} for ${next.duration_minutes} minutes`;
            console.log("📡 [commitConfig] Calling set_config() with:", next.mode, next.start_hour, next.start_minute, next.duration_minutes, next.charge_limit, desc);

            const res = await set_config(
                next.mode,
                next.start_hour,
                next.start_minute,
                next.duration_minutes,
                next.charge_limit,
                desc
            );

            console.log("📥 [commitConfig] set_config() response:", res);

            if (!res?.success) {
                console.error("❌ [commitConfig] Save failed:", res?.error);
                showModal(
                    <div style={{ padding: 16 }}>
                        <h3>Save failed</h3>
                        <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                            {String(res?.error ?? "Unknown error")}
                        </div>
                    </div>
                );
            } else {
                console.log("✅ [commitConfig] Save successful");
                globalConfig = next; // Update global state
            }

            console.log("🔄 [commitConfig] Refreshing status after save...");
            await loadStatus();
        } catch (e) {
            console.error("❌ [commitConfig] Exception caught:", e);
            showModal(
                <div style={{ padding: 16 }}>
                    <h3>Save error</h3>
                    <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{String(e)}</div>
                </div>
            );
        } finally {
            setLoading(false);
            console.log("🏁 [commitConfig] Config save complete");
        }
    };

    const applyNow = async () => {
        setApplying(true);
        try {
            console.log("🔄 [applyNow] Applying schedule...");
            const res = await apply_schedule_now();
            console.log("📥 [applyNow] apply_schedule_now() response:", res);

            if (!res?.success) {
                console.error("❌ [applyNow] Apply failed:", res?.error);
                showModal(
                    <div style={{ padding: 16 }}>
                        <h3>Apply failed</h3>
                        <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                            {String(res?.error ?? "Unknown error")}
                        </div>
                    </div>
                );
            } else {
                console.log("✅ [applyNow] Apply successful");
            }

            await loadStatus();
        } catch (e) {
            console.error("❌ [applyNow] Exception caught:", e);
            showModal(
                <div style={{ padding: 16 }}>
                    <h3>Apply error</h3>
                    <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{String(e)}</div>
                </div>
            );
        } finally {
            setApplying(false);
        }
    };

    // Debounced slider save - WORKING PATTERN
    const commitLimit = useMemo(
        () =>
            debounce((v: number) => {
                console.log("🎚️ [commitLimit] Debounced slider save:", v);
                setUiConfig(prev => {
                    const updated = { ...prev, charge_limit: v };
                    globalConfig = updated; // Update global state
                    commitConfig(updated);
                    return updated;
                });
            }, 300),
        [] // Empty dependency array - function is stable
    );

    // Dropdown change handlers - WORKING PATTERN
    const onModeChange = (option: SingleDropdownOption) => {
        console.log("🎛️ [Mode Dropdown] === CHANGE START ===");
        console.log("Changing from", uiConfig.mode, "to", option.data);
        console.log("Option object:", option);

        const updated = { ...uiConfig, mode: option.data as ChargeConfig["mode"] };
        globalConfig = updated; // Update global state
        setUiConfig(updated);
        commitConfig(updated);

        console.log("Updated globalConfig and uiConfig to:", updated);
        console.log("=== MODE CHANGE END ===");
    };

    const onTimeChange = (option: SingleDropdownOption) => {
        console.log("🕐 [Time Dropdown] === CHANGE START ===");
        console.log("Changing from", hhmm(uiConfig.start_hour, uiConfig.start_minute), "to", option.data);
        console.log("Option object:", option);

        const [h, m] = option.data.split(":").map(Number);
        const updated = { ...uiConfig, start_hour: h, start_minute: m };
        globalConfig = updated; // Update global state
        setUiConfig(updated);
        commitConfig(updated);

        console.log("Updated globalConfig and uiConfig to:", updated);
        console.log("=== TIME CHANGE END ===");
    };

    const onDurationChange = (option: SingleDropdownOption) => {
        console.log("⏱️ [Duration Dropdown] === CHANGE START ===");
        console.log("Changing from", uiConfig.duration_minutes, "to", option.data);
        console.log("Option object:", option);

        const updated = { ...uiConfig, duration_minutes: option.data as number };
        globalConfig = updated; // Update global state
        setUiConfig(updated);
        commitConfig(updated);

        console.log("Updated globalConfig and uiConfig to:", updated);
        console.log("=== DURATION CHANGE END ===");
    };

    // Slider change handler
    const onSliderChange = (v: number) => {
        console.log("🎚️ [Slider] Changed from", limitLocal, "to", v);
        setLimitLocal(v);
        commitLimit(v);
    };

    return (
        <div>
            {/* Status */}
            <PanelSection title="Status">
                <PanelSectionRow>
                    <div style={{ display: "flex", alignItems: "center", padding: "10px 0" }}>
                        <FaBolt style={{ marginRight: 8, color: "#4a9eff" }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "bold" }}>{status?.next_change ?? "—"}</div>
                            <div style={{ fontSize: 12, color: "#999" }}>
                                Current limit: {status?.current_limit ?? `${uiConfig.charge_limit}%`}
                                {lastUpdate && (
                                    <span style={{ marginLeft: 10, fontSize: 10 }}>
                                        (Updated: {lastUpdate.toLocaleTimeString()})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </PanelSectionRow>
            </PanelSection>

            {/* Mode */}
            <PanelSection title="Operation Mode">
                <PanelSectionRow>
                    <div onClick={(e) => e.stopPropagation()} style={{ display: "contents" }}>
                        <DropdownItem
                            label="Mode"
                            description={`Currently: ${modeOptions.find(o => o.data === uiConfig.mode)?.label ?? uiConfig.mode}`}
                            rgOptions={modeOptions}
                            selectedOption={uiConfig.mode}
                            onChange={onModeChange}
                        />
                    </div>
                </PanelSectionRow>
            </PanelSection>

            {/* Schedule */}
            {uiConfig.mode === "schedule" && (
                <PanelSection title="Schedule Configuration">
                    <PanelSectionRow>
                        <div onClick={(e) => e.stopPropagation()} style={{ display: "contents" }}>
                            <DropdownItem
                                label="Start Time"
                                description={`Currently: ${hhmm(uiConfig.start_hour, uiConfig.start_minute)}`}
                                rgOptions={timeOptions}
                                selectedOption={hhmm(uiConfig.start_hour, uiConfig.start_minute)}
                                onChange={onTimeChange}
                            />
                        </div>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <div onClick={(e) => e.stopPropagation()} style={{ display: "contents" }}>
                            <DropdownItem
                                label="Duration"
                                description={`Currently: ${uiConfig.duration_minutes} minutes`}
                                rgOptions={durationOptions}
                                selectedOption={uiConfig.duration_minutes}
                                onChange={onDurationChange}
                            />
                        </div>
                    </PanelSectionRow>

                    <PanelSectionRow>
                        <div onClick={(e) => e.stopPropagation()} style={{ display: "contents" }}>
                            <ButtonItem layout="below" onClick={applyNow} disabled={applying || loading}>
                                {applying ? "Applying..." : "Apply Schedule Now"}
                            </ButtonItem>
                        </div>
                    </PanelSectionRow>
                </PanelSection>
            )}

            {/* Charge Limit */}
            {uiConfig.mode !== "always_full" && (
                <PanelSection title="Charge Limit">
                    <PanelSectionRow>
                        <div onClick={(e) => e.stopPropagation()} style={{ display: "contents" }}>
                            <SliderField
                                label="Maximum Charge"
                                value={limitLocal}
                                min={50}
                                max={100}
                                step={5}
                                showValue
                                onChange={onSliderChange}
                            />
                        </div>
                    </PanelSectionRow>
                    <PanelSectionRow>
                        <div style={{ fontSize: 12, color: "#999", textAlign: "center" }}>
                            {uiConfig.mode === "always_limit"
                                ? "Always limit charge to preserve battery health"
                                : "Limit charge when not following schedule"}
                        </div>
                    </PanelSectionRow>
                </PanelSection>
            )}

            {/* Info */}
            <PanelSection title="Information">
                <PanelSectionRow>
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
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

    const listener = addEventListener("timer_event", () => {
        console.log("Timer event received");
    });

    return {
        name: "Smart Charge Scheduler",
        titleView: (
            <div className={staticClasses.Title}>
                <FaBolt style={{ marginRight: 8 }} />
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