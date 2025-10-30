import {
    definePlugin,
    addEventListener,
    removeEventListener,
    callable,
} from "@decky/api";
import {
    PanelSection,
    PanelSectionRow,
    DropdownItem,
    SliderField,
    showModal,
    staticClasses
} from "@decky/ui";
import { FaBolt } from "react-icons/fa";
import { useEffect, useState, useMemo } from "react";

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

const get_config = callable<any[], any>("get_config");
const set_config = callable<any[], any>("set_config");
const get_status = callable<any[], any>("get_status");
const apply_schedule_now = callable<any[], any>("apply_schedule_now");
const get_scheduler_status = callable<any[], any>("get_scheduler_status");

const debounce = <T extends (...args: any[]) => any>(fn: T, wait: number): T => {
    let t: ReturnType<typeof setTimeout>;
    return ((...args: Parameters<T>) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    }) as T;
};

const hhmm = (h: number, m: number) =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

let globalConfig: ChargeConfig = {
    mode: "schedule",
    start_hour: 8,
    start_minute: 0,
    duration_minutes: 60,
    charge_limit: 80,
};

function Content() {
    const [uiConfig, setUiConfig] = useState<ChargeConfig>(globalConfig);
    const [status, setStatus] = useState<ChargeStatus | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [limitLocal, setLimitLocal] = useState<number>(globalConfig.charge_limit);
    const [schedulerStatus, setSchedulerStatus] = useState<any>(null);

    useEffect(() => setLimitLocal(uiConfig.charge_limit), [uiConfig.charge_limit]);
    const modeOptions: SingleDropdownOption[] = useMemo(
        () => [
            { data: "schedule", label: "Follow Schedule" },
            { data: "always_full", label: "Always Full Power" },
            { data: "always_limit", label: "Always Limit" },
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
    useEffect(() => {
        (async () => {
            try {
                const res = await get_config();

                // FAIL LOUDLY - Don't provide defaults when backend config is missing
                if (!res || res.MODE === undefined || res.START_HOUR === undefined || res.START_MINUTE === undefined || res.DURATION_MINUTES === undefined || res.CHARGE_LIMIT === undefined) {
                    throw new Error("Backend returned incomplete or missing configuration");
                }

                const cfg: ChargeConfig = {
                    mode: res.MODE,
                    start_hour: res.START_HOUR,
                    start_minute: res.START_MINUTE,
                    duration_minutes: res.DURATION_MINUTES,
                    charge_limit: res.CHARGE_LIMIT,
                };

                globalConfig = cfg;
                setUiConfig(cfg);
            } catch (e) {
                console.error("Failed to load config:", e);
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

    const loadSchedulerStatus = async () => {
        try {
            const res = await get_scheduler_status();
            setSchedulerStatus(res);
        } catch (error) {
            console.error("Failed to load scheduler status:", error);
            setSchedulerStatus(null);
        }
    };

    const loadStatus = async () => {
        try {
            const res = await get_status();

            if (res && !res.error) {
                setStatus(res);
            } else {
                setStatus(null);
            }
        } catch (error) {
            console.error("Failed to load status:", error);
            setStatus(null);
        } finally {
            setLastUpdate(new Date());
        }

        await loadSchedulerStatus();
    };

    const commitConfig = async (next: ChargeConfig) => {
        setUiConfig(next); // optimistic
        try {
            const desc = `Schedule: ${hhmm(next.start_hour, next.start_minute)} for ${next.duration_minutes} minutes`;

            const res = await set_config(
                next.mode,
                next.start_hour,
                next.start_minute,
                next.duration_minutes,
                next.charge_limit,
                desc
            );

            if (!res?.success) {
                console.error("Save failed:", res?.error);
                showModal(
                    <div style={{ padding: 16 }}>
                        <h3>Save failed</h3>
                        <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                            {String(res?.error ?? "Unknown error")}
                        </div>
                    </div>
                );
            } else {
                globalConfig = next;
                await apply_schedule_now();
            }

            await loadStatus();
        } catch (e) {
            console.error("Save error:", e);
            showModal(
                <div style={{ padding: 16 }}>
                    <h3>Save error</h3>
                    <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{String(e)}</div>
                </div>
            );
        }
    };

    const commitLimit = useMemo(
        () =>
            debounce((v: number) => {
                setUiConfig(prev => {
                    const updated = { ...prev, charge_limit: v };
                    globalConfig = updated; // 
                    commitConfig(updated);
                    return updated;
                });
            }, 300),
        []
    );

    const onModeChange = (option: SingleDropdownOption) => {
        const updated = { ...uiConfig, mode: option.data as ChargeConfig["mode"] };
        globalConfig = updated;
        setUiConfig(updated);
        commitConfig(updated);
    };

    const onTimeChange = (option: SingleDropdownOption) => {
        const [h, m] = option.data.split(":").map(Number);
        const updated = { ...uiConfig, start_hour: h, start_minute: m };
        globalConfig = updated;
        setUiConfig(updated);
        commitConfig(updated);
    };

    const onDurationChange = (option: SingleDropdownOption) => {
        const updated = { ...uiConfig, duration_minutes: option.data as number };
        globalConfig = updated;
        setUiConfig(updated);
        commitConfig(updated);
    };

    const onSliderChange = (v: number) => {
        setLimitLocal(v);
        commitLimit(v);
    };

    return (
        <div style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <PanelSection title="Information">
                <PanelSectionRow>
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                        <strong>Smart Charge Scheduler</strong><br />
                        Manage your Steam Deck's battery charging to prolong battery health.
                        Set schedules for when charging should be limited, or use always-on modes.
                    </div>
                </PanelSectionRow>
            </PanelSection>

            <PanelSection title="Status">
                <PanelSectionRow>
                    <div style={{ display: "flex", alignItems: "center", padding: "10px 0" }}>
                        <FaBolt style={{ marginRight: 8, color: "#4a9eff" }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "bold" }}>{status?.next_change || "ERROR: Status not available"}</div>
                            <div style={{ fontSize: 12, color: "#999" }}>
                                Current limit: {status?.current_limit || "ERROR: Status not available"}
                                {lastUpdate && (
                                    <span style={{ marginLeft: 10, fontSize: 10 }}>
                                        (Updated: {lastUpdate.toLocaleTimeString()})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </PanelSectionRow>
                <PanelSectionRow>
                    <div style={{ display: "flex", alignItems: "center", padding: "10px 0" }}>
                        <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            marginRight: 8,
                            backgroundColor: schedulerStatus?.scheduler_active ? "#4CAF50" :
                                schedulerStatus?.scheduler_running ? "#FF9800" : "#F44336"
                        }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: "#999" }}>
                                Background Scheduler: {schedulerStatus?.message || "ERROR: Scheduler status not available"}
                            </div>
                        </div>
                    </div>
                </PanelSectionRow>
            </PanelSection>

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
                </PanelSection>
            )}

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
        </div>
    );
}

export default definePlugin(() => {
    const listener = addEventListener("timer_event", () => { });

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
            removeEventListener("timer_event", listener);
        },
    };
});