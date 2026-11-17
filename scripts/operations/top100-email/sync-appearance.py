#!/usr/bin/env python3
"""Check or apply the versioned Top100 Email appearance on the Dokploy host."""
import argparse
import json
from pathlib import Path
import subprocess

ASSETS = Path(__file__).resolve().parent
PROJECT = 'top100-email-standalone'
TEMPLATE = 'Top100 Africa Future Leaders'
SETTINGS = {
    'appearance.admin.custom_css': 'admin.css',
    'appearance.admin.custom_js': 'admin.js',
    'appearance.public.custom_css': 'public.css',
}
BRAND_KEYS = {'app.site_name', 'app.logo_url', 'app.favicon_url'}


def literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def query(sql: str) -> str:
    return subprocess.check_output(
        ['docker', 'exec', '-i', f'{PROJECT}-db-1', 'psql', '-XqAt',
         '-v', 'ON_ERROR_STOP=1', '-U', 'listmonk', '-d', 'listmonk'],
        input=sql, text=True,
    ).strip()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Update the live appearance if it differs')
    args = parser.parse_args()

    settings = json.loads((ASSETS / 'settings.json').read_text())
    if set(settings) != BRAND_KEYS or not all(isinstance(v, str) for v in settings.values()):
        raise SystemExit('Unexpected keys or values in settings.json')
    settings.update({key: (ASSETS / filename).read_text() for key, filename in SETTINGS.items()})
    template_body = (ASSETS / 'campaign-template.html').read_text()
    if '{{ template "content" . }}' not in template_body or '{{ UnsubscribeURL }}' not in template_body:
        raise SystemExit('The campaign template must retain the content and unsubscribe placeholders.')

    values = ','.join(f'({literal(k)},{literal(json.dumps(v))}::jsonb)' for k, v in settings.items())
    name = literal(TEMPLATE)
    body = literal(template_body)
    check = f"""
SET standard_conforming_strings=on;
WITH expected(key,value) AS (VALUES {values})
SELECT
  NOT EXISTS (
    SELECT 1 FROM expected e LEFT JOIN settings s USING (key)
    WHERE s.value IS DISTINCT FROM e.value
  ) AND (SELECT count(*) FROM templates WHERE name={name})=1
    AND EXISTS (
      SELECT 1 FROM templates WHERE name={name} AND type='campaign'
        AND is_default AND body={body}
    );
"""
    if query(check) == 't':
        print('Live Top100 Email appearance and default template match Git assets.')
        return
    if not args.apply:
        raise SystemExit('Live appearance differs. Run with --apply on the Dokploy host to sync it.')

    query(f"""
BEGIN;
SET LOCAL standard_conforming_strings=on;
LOCK campaigns, templates IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM campaigns WHERE status IN ('running','scheduled')) THEN
    RAISE EXCEPTION 'Wait for active campaigns to finish before applying appearance.';
  END IF;
  IF (SELECT count(*) FROM templates WHERE name={name}) > 1 OR EXISTS (
    SELECT 1 FROM templates WHERE name={name} AND type<>'campaign'
  ) THEN
    RAISE EXCEPTION 'The named Top100 template is ambiguous.';
  END IF;
END $$;
INSERT INTO settings (key,value) VALUES {values}
ON CONFLICT (key) DO UPDATE SET value=excluded.value, updated_at=now()
WHERE settings.value IS DISTINCT FROM excluded.value;
INSERT INTO templates (name,type,subject,body)
SELECT {name},'campaign','',{body}
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name={name});
UPDATE templates SET is_default=false, updated_at=now()
WHERE is_default AND name<>{name};
UPDATE templates SET body={body},is_default=true,updated_at=now()
WHERE name={name} AND (body IS DISTINCT FROM {body} OR NOT is_default);
COMMIT;
""")
    subprocess.run(['docker', 'restart', f'{PROJECT}-app-1'], check=True, stdout=subprocess.DEVNULL)
    if query(check) != 't':
        raise SystemExit('Appearance did not match after syncing.')
    print('Applied and verified the versioned Top100 Email appearance.')


if __name__ == '__main__':
    main()
