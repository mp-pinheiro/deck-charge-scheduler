import os
import subprocess
import asyncio
import re
from pathlib import Path
import decky

class Plugin:
    def __init__(self):
        self.plugin_dir = Path(__file__).parent
        self.script_path = self.plugin_dir / "charge-scheduler.sh"
        self.config_path = self.plugin_dir / "charge-scheduler.conf"
        self.log_path = Path.home() / ".local/share/charge-scheduler.log"

    # ---------- helpers ----------

    def _default_cfg(self) -> dict:
        return {
            "MODE": "schedule",
            "START_HOUR": 8,
            "START_MINUTE": 0,
            "DURATION_MINUTES": 60,
            "CHARGE_LIMIT": 80,
            "SCHEDULE_DESCRIPTION": "Default configuration",
        }

    def _read_cfg(self) -> dict:
        if not self.config_path.exists():
            return self._default_cfg()
        cfg: dict[str, object] = {}
        with open(self.config_path, "r") as f:
            for ln in f:
                ln = ln.strip()
                if ln and not ln.startswith("#") and "=" in ln:
                    k, v = ln.split("=", 1)
                    cfg[k.strip()] = v.strip().strip('"')
        for k in ["START_HOUR", "START_MINUTE", "DURATION_MINUTES", "CHARGE_LIMIT"]:
            if k in cfg:
                try:
                    cfg[k] = int(cfg[k])  # type: ignore
                except Exception:
                    cfg[k] = int(str(cfg[k]).split()[0])  # type: ignore
        return cfg  # type: ignore

    def _write_cfg(self, mode: str, sh: int, sm: int, dur: int, limit: int, desc: str) -> None:
        text = f"""# Steam Deck Charge Scheduler Configuration
# This file is automatically managed by the Decky plugin GUI
# Manual editing is not recommended

# Operating mode: schedule, always_full, always_limit
MODE={mode}

# Schedule configuration (for "schedule" mode)
START_HOUR={sh}
START_MINUTE={sm}
DURATION_MINUTES={dur}

# Default charge limit (50-100%)
CHARGE_LIMIT={limit}

# Schedule description (optional, for display purposes)
SCHEDULE_DESCRIPTION="{desc}"
"""
        with open(self.config_path, "w") as f:
            f.write(text)

    async def _tail_logs(self, n: int) -> list[str]:
        if not self.log_path.exists():
            return []
        with open(self.log_path, "r") as f:
            lines = f.readlines()
        return [ln.strip() for ln in lines[-n:]]

    # ---------- callables ----------

    @decky.callable
    async def get_config(self) -> dict:
        decky.logger.info("🔄 [get_config] Request received")
        try:
            config = self._read_cfg()
            decky.logger.info(f"✅ [get_config] Returning config: {config}")
            return config
        except Exception as e:
            decky.logger.error(f"❌ [get_config] Error: {e}")
            fallback = self._default_cfg()
            fallback["error"] = str(e)
            return fallback

    @decky.callable
    async def set_config(
        self,
        mode: str,
        start_hour: int,
        start_minute: int,
        duration: int,
        charge_limit: int,
        description: str = "",
    ) -> dict:
        decky.logger.info(f"💾 [set_config] Request: mode={mode}, time={start_hour}:{start_minute}, duration={duration}, limit={charge_limit}%")

        try:
            if mode not in ["schedule", "always_full", "always_limit"]:
                error_msg = "Invalid mode"
                decky.logger.error(f"❌ [set_config] {error_msg}: {mode}")
                return {"success": False, "error": error_msg}
            if not (0 <= start_hour <= 23) or not (0 <= start_minute <= 59):
                error_msg = "Invalid time values"
                decky.logger.error(f"❌ [set_config] {error_msg}: {start_hour}:{start_minute}")
                return {"success": False, "error": error_msg}
            if not (5 <= duration <= 480):
                error_msg = "Duration must be 5–480 minutes"
                decky.logger.error(f"❌ [set_config] {error_msg}: {duration}")
                return {"success": False, "error": error_msg}
            if not (50 <= charge_limit <= 100):
                error_msg = "Charge limit must be 50–100"
                decky.logger.error(f"❌ [set_config] {error_msg}: {charge_limit}")
                return {"success": False, "error": error_msg}

            try:
                os.chmod(self.script_path, 0o755)
                decky.logger.info("🔧 [set_config] Script permissions set")
            except Exception as e:
                decky.logger.warning(f"⚠️ [set_config] Could not set script permissions: {e}")

            self._write_cfg(mode, start_hour, start_minute, duration, charge_limit, description)
            decky.logger.info(f"✅ [set_config] Config saved successfully: {mode} {start_hour}:{start_minute} {duration}m {charge_limit}%")
            return {"success": True, "message": "Configuration saved successfully"}
        except Exception as e:
            decky.logger.error(f"❌ [set_config] Exception: {e}")
            return {"success": False, "error": str(e)}

    @decky.callable
    async def get_status(self) -> dict:
        decky.logger.info("🔄 [get_status] Request received")
        try:
            cfg = self._read_cfg()
            decky.logger.info(f"📖 [get_status] Config loaded: {cfg}")

            logs = await self._tail_logs(20)
            decky.logger.info(f"📋 [get_status] Found {len(logs)} log entries")

            current = "Unknown"
            if logs:
                last_log = logs[-1]
                decky.logger.info(f"📝 [get_status] Last log: {last_log}")
                m = re.search(r"Successfully set charge limit to (\d+)%", last_log)
                if m:
                    current = f"{m.group(1)}%"
                    decky.logger.info(f"✅ [get_status] Parsed current limit from log: {current}")

            if current == "Unknown":
                current = "100%" if cfg.get("MODE") == "always_full" else f"{cfg.get('CHARGE_LIMIT', 80)}%"
                decky.logger.info(f"🔮 [get_status] Using predicted current limit: {current}")

            mode = cfg.get("MODE", "schedule")
            if mode == "schedule":
                from datetime import datetime, time as dt_time, timedelta
                sh = int(cfg.get("START_HOUR", 8))
                sm = int(cfg.get("START_MINUTE", 0))
                dur = int(cfg.get("DURATION_MINUTES", 60))
                now = datetime.now()
                start = datetime.combine(now.date(), dt_time(sh, sm))
                end = start + timedelta(minutes=dur)
                if now < start:
                    next_change = f"Full charge at {start.strftime('%H:%M')}"
                elif now < end:
                    next_change = f"Limited charge at {end.strftime('%H:%M')}"
                else:
                    next_change = f"Full charge at {(start + timedelta(days=1)).strftime('%H:%M')}"
            elif mode == "always_full":
                next_change = "Always charging to 100%"
            else:
                next_change = f"Always limited to {cfg.get('CHARGE_LIMIT', 80)}%"

            return {
                "current_limit": current,
                "next_change": next_change,
                "config": cfg,
                "script_path": str(self.script_path),
                "config_file_exists": self.config_path.exists(),
            }
        except Exception as e:
            decky.logger.error(f"get_status error: {e}")
            cfg = self._read_cfg()
            return {
                "current_limit": f"{cfg.get('CHARGE_LIMIT', 80)}%",
                "next_change": "Schedule active" if cfg.get("MODE") == "schedule" else "—",
                "config": cfg,
                "script_path": str(self.script_path),
                "config_file_exists": self.config_path.exists(),
                "error": str(e),
            }

    @decky.callable
    async def apply_schedule_now(self) -> dict:
        try:
            result = subprocess.run(
                [str(self.script_path), "reload"],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                decky.logger.info("Schedule applied")
                return {"success": True}
            return {"success": False, "error": result.stderr or result.stdout}
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Operation timed out"}
        except Exception as e:
            decky.logger.error(f"apply_schedule_now error: {e}")
            return {"success": False, "error": str(e)}

    # ---------- lifecycle ----------
    async def _main(self):
        decky.logger.info("Charge Scheduler backend started")
        try:
            os.chmod(self.script_path, 0o755)
        except Exception:
            pass

    async def _unload(self):
        decky.logger.info("Charge Scheduler backend stopped")

    async def _uninstall(self):
        decky.logger.info("Charge Scheduler backend uninstalled")

    async def _migration(self):
        decky.logger.info("Charge Scheduler migration: none")
