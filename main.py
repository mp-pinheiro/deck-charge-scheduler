import os
import subprocess
import asyncio
import re
from pathlib import Path

# The decky plugin module is located at decky-loader/plugin
import decky

class Plugin:
    def __init__(self):
        # Get the plugin directory
        self.plugin_dir = Path(__file__).parent
        self.script_path = self.plugin_dir / "charge-scheduler.sh"
        self.config_path = self.plugin_dir / "charge-scheduler.conf"
        self.log_path = Path.home() / ".local/share/charge-scheduler.log"

    # Configuration management functions

    @decky.callable
    async def get_config(self) -> dict:
        """Get current configuration from config file"""
        try:
            config = {}

            if not self.config_path.exists():
                return {
                    "MODE": "schedule",
                    "START_HOUR": 8,
                    "START_MINUTE": 0,
                    "DURATION_MINUTES": 60,
                    "CHARGE_LIMIT": 80,
                    "SCHEDULE_DESCRIPTION": "Default configuration"
                }

            # Parse config file
            with open(self.config_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip().strip('"')

            # Convert numeric values
            for key in ['START_HOUR', 'START_MINUTE', 'DURATION_MINUTES', 'CHARGE_LIMIT']:
                if key in config:
                    try:
                        config[key] = int(config[key])
                    except ValueError:
                        config[key] = int(config[key].split()[0])  # Handle values like "80%"

            return config

        except Exception as e:
            decky.logger.error(f"Error reading config: {e}")
            return {}

    @decky.callable
    async def set_config(self, mode: str, start_hour: int, start_minute: int,
                        duration: int, charge_limit: int, description: str = "") -> dict:
        """Update configuration in config file"""
        try:
            # Validate inputs
            if mode not in ["schedule", "always_full", "always_limit"]:
                return {"success": False, "error": "Invalid mode"}

            if not (0 <= start_hour <= 23) or not (0 <= start_minute <= 59):
                return {"success": False, "error": "Invalid time values"}

            if not (5 <= duration <= 480):  # 5 minutes to 8 hours
                return {"success": False, "error": "Duration must be between 5 and 480 minutes"}

            if not (50 <= charge_limit <= 100):
                return {"success": False, "error": "Charge limit must be between 50 and 100"}

            # Create new config content
            config_content = f"""# Steam Deck Charge Scheduler Configuration
# This file is automatically managed by the Decky plugin GUI
# Manual editing is not recommended

# Operating mode: schedule, always_full, always_limit
MODE={mode}

# Schedule configuration (for "schedule" mode)
START_HOUR={start_hour}
START_MINUTE={start_minute}
DURATION_MINUTES={duration}

# Default charge limit (50-100%)
CHARGE_LIMIT={charge_limit}

# Schedule description (optional, for display purposes)
SCHEDULE_DESCRIPTION="{description}"
"""

            # Write to config file
            with open(self.config_path, 'w') as f:
                f.write(config_content)

            decky.logger.info(f"Configuration updated: {mode}, {start_hour}:{start_minute}, {duration}min, {charge_limit}%")

            return {"success": True, "message": "Configuration updated successfully"}

        except Exception as e:
            decky.logger.error(f"Error setting config: {e}")
            return {"success": False, "error": str(e)}

    # Script execution functions

    @decky.callable
    async def set_limit_immediate(self, limit: int) -> dict:
        """Set charge limit immediately using the script"""
        try:
            if not (50 <= limit <= 100):
                return {"success": False, "error": "Charge limit must be between 50 and 100"}

            result = subprocess.run(
                [str(self.script_path), "set", str(limit)],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                decky.logger.info(f"Charge limit set to {limit}%")
                return {"success": True, "message": f"Charge limit set to {limit}%"}
            else:
                return {"success": False, "error": result.stderr}

        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Operation timed out"}
        except Exception as e:
            decky.logger.error(f"Error setting charge limit: {e}")
            return {"success": False, "error": str(e)}

    @decky.callable
    async def get_status(self) -> dict:
        """Get current scheduler status"""
        try:
            # Get current configuration
            config = await self.get_config()

            # Get recent logs
            logs = await self.get_logs(20)  # Get last 20 lines

            # Parse last log entry for current status
            current_limit = "Unknown"
            if logs:
                last_log = logs[-1]
                # Try to extract charge limit from log
                match = re.search(r'Successfully set charge limit to (\d+)%', last_log)
                if match:
                    current_limit = f"{match.group(1)}%"

            # Calculate next scheduled change
            mode = config.get("MODE", "schedule")
            if mode == "schedule":
                start_hour = config.get("START_HOUR", 8)
                start_minute = config.get("START_MINUTE", 0)
                duration = config.get("DURATION_MINUTES", 60)

                from datetime import datetime, time as dt_time, timedelta
                now = datetime.now()
                today = now.date()

                start_time = datetime.combine(today, dt_time(start_hour, start_minute))
                end_time = start_time + timedelta(minutes=duration)

                if now < start_time:
                    next_change = f"Full charge at {start_time.strftime('%H:%M')}"
                elif now < end_time:
                    next_change = f"Limited charge at {end_time.strftime('%H:%M')}"
                else:
                    tomorrow_start = start_time + timedelta(days=1)
                    next_change = f"Full charge at {tomorrow_start.strftime('%H:%M')}"
            elif mode == "always_full":
                next_change = "Always charging to 100%"
            else:  # always_limit
                limit = config.get("CHARGE_LIMIT", 80)
                next_change = f"Always limited to {limit}%"

            return {
                "current_limit": current_limit,
                "next_change": next_change,
                "config": config,
                "script_path": str(self.script_path),
                "config_file_exists": self.config_path.exists()
            }

        except Exception as e:
            decky.logger.error(f"Error getting status: {e}")
            return {"error": str(e)}

    @decky.callable
    async def get_logs(self, lines: int = 50) -> list:
        """Get recent log entries"""
        try:
            if not self.log_path.exists():
                return []

            # Read last N lines from log file
            with open(self.log_path, 'r') as f:
                all_lines = f.readlines()
                return [line.strip() for line in all_lines[-lines:]]

        except Exception as e:
            decky.logger.error(f"Error reading logs: {e}")
            return []

    @decky.callable
    async def apply_schedule_now(self) -> dict:
        """Apply schedule immediately"""
        try:
            result = subprocess.run(
                [str(self.script_path), "reload"],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                decky.logger.info("Schedule applied manually")
                return {"success": True, "message": "Schedule applied successfully"}
            else:
                return {"success": False, "error": result.stderr}

        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Operation timed out"}
        except Exception as e:
            decky.logger.error(f"Error applying schedule: {e}")
            return {"success": False, "error": str(e)}

    async def test_script_access(self) -> dict:
        """Test if the script is accessible and working"""
        try:
            # Test script existence and permissions
            if not self.script_path.exists():
                return {"success": False, "error": "Script file not found"}

            if not os.access(self.script_path, os.X_OK):
                return {"success": False, "error": "Script is not executable"}

            # Test script functionality with config command
            result = subprocess.run(
                [str(self.script_path), "config"],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                return {"success": True, "message": "Script is accessible and working"}
            else:
                return {"success": False, "error": result.stderr}

        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Script test timed out"}
        except Exception as e:
            decky.logger.error(f"Error testing script: {e}")
            return {"success": False, "error": str(e)}

    # Lifecycle methods

    async def _main(self):
        decky.logger.info("Deck Charge Scheduler Plugin started")
        self.loop = asyncio.get_event_loop()

        # Test script access on startup
        test_result = await self.test_script_access()
        if not test_result["success"]:
            decky.logger.error(f"Script access test failed: {test_result['error']}")
        else:
            decky.logger.info("Script access test passed")

    async def _unload(self):
        decky.logger.info("Deck Charge Scheduler Plugin stopped")

    async def _uninstall(self):
        decky.logger.info("Deck Charge Scheduler Plugin uninstalled")

    async def _migration(self):
        decky.logger.info("Running plugin migrations")
        # No migrations needed for now