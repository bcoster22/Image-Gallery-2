import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Attempt to find moondream path if not installed
# Based on user environment: ~/.moondream-station/moondream-station
moondream_path = os.path.expanduser("~/.moondream-station/moondream-station")
if os.path.exists(moondream_path) and moondream_path not in sys.path:
    sys.path.append(moondream_path)

try:
    from moondream_station.core.system_diagnostics import SystemDiagnostician
except ImportError:
    # Fail gracefully if we can't find it, effectively skipping
    SystemDiagnostician = None

class TestSystemDiagnostics(unittest.TestCase):
    def setUp(self):
        if SystemDiagnostician is None:
            self.skipTest("moondream_station package not found")
        self.config_root = "/mock/root"
        self.diagnostician = SystemDiagnostician(self.config_root)

    def test_init_solutions_paths(self):
        """Verify that solution paths are constructed correctly using config_root."""
        solutions = self.diagnostician.solutions
        
        # Check gpu_persistence
        cmd = solutions["gpu_persistence"]["command"]
        expected_script = os.path.join(self.config_root, "scripts", "apply_system_fixes.py")
        self.assertIn(expected_script, cmd)
        self.assertIn("sudo", cmd)
        self.assertIn("gpu_persistence", cmd)

    @patch("subprocess.run")
    def test_apply_fix_success(self, mock_run):
        """Test successful fix application."""
        mock_run.return_value = MagicMock(returncode=0, stdout="Success")
        
        result = self.diagnostician.apply_fix("gpu_persistence")
        
        self.assertTrue(result["success"])
        self.assertIn("Fix applied", result["message"])
        mock_run.assert_called_once()
        
        # Verify arguments
        args = mock_run.call_args[0][0] # usage: subprocess.run(cmd.split(), ...)
        self.assertTrue(isinstance(args, list))
        # Expected: sudo /usr/bin/python3 /mock/root/scripts/apply_system_fixes.py gpu_persistence
        self.assertEqual(args[0], "sudo")
        self.assertEqual(args[1], "/usr/bin/python3")
        self.assertIn("apply_system_fixes.py", args[2])
        self.assertEqual(args[3], "gpu_persistence")

    @patch("subprocess.run")
    def test_apply_fix_failure(self, mock_run):
        """Test failed fix application."""
        mock_run.return_value = MagicMock(returncode=1, stderr="Permission denied")
        
        result = self.diagnostician.apply_fix("gpu_persistence")
        
        self.assertFalse(result["success"])
        self.assertIn("Fix failed", result["message"])
        self.assertIn("Permission denied", result["message"])

    def test_apply_fix_unknown_id(self):
        """Test applying a non-existent fix."""
        result = self.diagnostician.apply_fix("non_existent_id")
        self.assertFalse(result["success"])
        self.assertIn("Unknown fix ID", result["message"])

if __name__ == "__main__":
    unittest.main()
