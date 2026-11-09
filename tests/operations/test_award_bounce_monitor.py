import importlib.util
from pathlib import Path
import unittest
import subprocess
import tempfile
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('bounce_monitor', Path(__file__).parents[2] / 'scripts/award-outreach-bounce-monitor.py')
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)

class BounceMonitorTests(unittest.TestCase):
    def test_permanent_failure_for_award_sender(self):
        line = '2026-11-09T10:54:23Z INFO DSN permanent failure notification (delivery.dsn-perm-fail) queueId = 123, queueName = "remote", from = "gabriel@top100afl.com", to = ["Test@example.org"], size = 5197, total = 1, to = "Test@example.org", hostname = "mx.example.org", code = 550, details = "Mailbox not found"'
        self.assertEqual(monitor.parse_permanent_failure(line), ('123', 'test@example.org', '2026-11-09T10:54:23Z'))

    def test_does_not_suppress_temporary_or_other_senders(self):
        sample = '2026-11-09T10:54:23Z INFO {event} queueId = 123, from = "{sender}", to = ["user@example.org"], to = "user@example.org", code = 451'
        self.assertIsNone(monitor.parse_permanent_failure(sample.format(event='(delivery.rcpt-to-rejected)', sender='gabriel@top100afl.com')))
        self.assertIsNone(monitor.parse_permanent_failure(sample.format(event='(delivery.dsn-perm-fail)', sender='other@top100afl.com')))

    def test_rejects_multi_recipient_or_malformed_events(self):
        sample = '2026-11-09T10:54:23Z INFO (delivery.dsn-perm-fail) queueId = 123, from = "gabriel@top100afl.com", to = ["user@example.org", "other@example.org"], to = "user@example.org"'
        self.assertIsNone(monitor.parse_permanent_failure(sample))
        self.assertIsNone(monitor.parse_permanent_failure('delivery.dsn-perm-fail'))

    def test_does_not_advance_cursor_if_database_update_fails(self):
        log = '2026-11-09T10:54:23Z INFO (delivery.dsn-perm-fail) queueId = 123, from = "gabriel@top100afl.com", to = ["user@example.org"], to = "user@example.org"'
        def run(command, **kwargs):
            if command[1] == 'logs':
                return subprocess.CompletedProcess(command, 0, stdout=log, stderr='')
            raise subprocess.CalledProcessError(1, command)
        with tempfile.TemporaryDirectory() as directory:
            cursor = Path(directory) / 'cursor'
            with patch.object(monitor, 'CURSOR', cursor), patch.object(monitor.subprocess, 'run', side_effect=run):
                with self.assertRaises(subprocess.CalledProcessError): monitor.main()
                self.assertFalse(cursor.exists())

    def test_quote_sql_value(self):
        self.assertEqual(monitor.sql_literal("a'b"), "'a''b'")

if __name__ == '__main__': unittest.main()
