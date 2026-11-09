#!/usr/bin/env python3
"""Hold award outreach contacts after Stalwart reports permanent failure.

Run on the Dokploy host. The cursor is advanced only after the database update
succeeds. Replaying overlapping log windows is safe: already-held contacts are
not modified again. Temporary delivery errors are deliberately ignored.
"""
import datetime as dt
import os
from pathlib import Path
import re
import subprocess
import sys

SENDER = 'gabriel@top100afl.com'
MAIL_CONTAINER = 'top100-stalwart-ettvpo-stalwart-mail-1'
DB_CONTAINER = 'top100-supabase-nhbjgd-db-1'
CURSOR = Path('/var/lib/top100-award-outreach/bounce-cursor')
ADDRESS = re.compile(r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+$")


def parse_permanent_failure(line):
    if '(delivery.dsn-perm-fail)' not in line:
        return None
    stamp = re.match(r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s', line)
    queue = re.search(r'\bqueueId = (\d+)(?:,|\s|$)', line)
    sender = re.search(r'\bfrom = "([^"\r\n]+)"', line)
    recipients = re.search(r'\bto = \["([^"\r\n]+)"\]', line)
    one = re.search(r'\bto = "([^"\r\n]+)"', line)
    if not all((stamp, queue, sender, recipients, one)):
        return None
    address = one.group(1).lower()
    if sender.group(1).lower() != SENDER or recipients.group(1).lower() != address or not ADDRESS.fullmatch(address):
        return None
    return queue.group(1), address, stamp.group(1)


def sql_literal(value):
    return "'" + value.replace("'", "''") + "'"


def sql_for_event(event):
    queue, address, timestamp = event
    note = sql_literal('Automatic outreach hold: Stalwart reported a permanent delivery failure (queue ' + queue + ').')
    return '''UPDATE public.award_outreach_contacts AS contact
SET suppressed = true,
    notes = CASE WHEN length(contact.notes) + length({note}) + 1 <= 3000
      THEN concat_ws(E'\\n', nullif(contact.notes, ''), {note}) ELSE contact.notes END,
    updated_at = now()
WHERE NOT contact.suppressed AND contact.awardee_id IN (
  SELECT recipient.awardee_id
  FROM public.award_outreach_recipients AS recipient
  JOIN public.award_outreach_campaigns AS campaign ON campaign.id = recipient.campaign_id
  WHERE lower(trim(recipient.email)) = {address}
    AND recipient.status IN ('processing', 'sent', 'delivery_unknown')
    AND campaign.created_at <= {stamp}::timestamptz
    AND campaign.created_at >= {stamp}::timestamptz - interval '30 days'
);'''.format(note=note, address=sql_literal(address), stamp=sql_literal(timestamp))


def main():
    now = dt.datetime.now(dt.timezone.utc)
    try:
        start = dt.datetime.fromisoformat(CURSOR.read_text().strip().replace('Z', '+00:00'))
        if start.tzinfo is None or start > now:
            raise ValueError('Invalid cursor time')
    except FileNotFoundError:
        start = now - dt.timedelta(days=1)
    since = (start - dt.timedelta(seconds=10)).isoformat()
    result = subprocess.run(['docker', 'logs', '--since', since, MAIL_CONTAINER], capture_output=True, text=True, check=True)
    lines = result.stdout.splitlines() + result.stderr.splitlines()
    events = list(dict.fromkeys(event for line in lines if (event := parse_permanent_failure(line))))
    if events:
        sql = 'BEGIN;\n' + '\n'.join(sql_for_event(event) for event in events) + '\nCOMMIT;\n'
        subprocess.run(['docker', 'exec', '-i', DB_CONTAINER, 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], input=sql, text=True, check=True)
    CURSOR.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    tmp = CURSOR.with_suffix('.tmp')
    tmp.write_text(now.isoformat())
    os.replace(tmp, CURSOR)
    print('Checked permanent-failure events:', len(events))


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print('Bounce monitor failed; cursor was not advanced:', type(error).__name__, file=sys.stderr)
        sys.exit(1)
