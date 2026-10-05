"""Run on the VPS. Dry-run by default; --apply updates only verified local images.
Backs up affected rows before applying changes. Never downloads from the old host.
"""
import argparse
import concurrent.futures
import datetime
import json
import os
import pathlib
import subprocess
import urllib.parse
import urllib.request

OLD_HOST = 'zsavekrhfwrpqudhjvlq.supabase.co'
NEW_HOST = 'supabase.top100afl.com'
DB_CONTAINER = 'top100-supabase-nhbjgd-db-1'
FIELDS = {'awardees': ['avatar_url', 'image_url', 'cover_image_url'], 'profiles': ['avatar_url', 'cover_image_url', 'portfolio_cover_url']}

def query(sql):
    result = subprocess.run(['docker', 'exec', '-i', DB_CONTAINER, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'supabase_admin', '-d', 'postgres', '-At'], input=sql, capture_output=True, text=True, check=True)
    return result.stdout.strip()

def literal(value):
    return "'" + str(value).replace("'", "''") + "'"

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--backup-dir', default='/root/top100-repair-backups')
    args = parser.parse_args()
    rows = []
    for table, fields in FIELDS.items():
        predicate = ' OR '.join(f"{field} LIKE {literal('https://' + OLD_HOST + '/storage/v1/object/public/%')}" for field in fields)
        raw = query(f'SELECT row_to_json(t) FROM public.{table} t WHERE {predicate};')
        rows.extend((table, json.loads(line)) for line in raw.splitlines() if line)
    candidates = []
    for table, row in rows:
        for field in FIELDS[table]:
            old = row.get(field)
            if not old:
                continue
            parsed = urllib.parse.urlsplit(old)
            prefix = '/storage/v1/object/public/'
            if parsed.hostname != OLD_HOST or not parsed.path.startswith(prefix):
                continue
            bucket, separator, path = urllib.parse.unquote(parsed.path[len(prefix):]).partition('/')
            if not separator:
                continue
            new = urllib.parse.urlunsplit(('https', NEW_HOST, parsed.path, parsed.query, ''))
            candidates.append(dict(table=table, id=row['id'], field=field, old=old, new=new, bucket=bucket, path=path))
    def verify(item):
        exists = query(f"SELECT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id={literal(item['bucket'])} AND name={literal(item['path'])});") == 't'
        if not exists:
            return False
        try:
            with urllib.request.urlopen(item['new'], timeout=15) as response:
                return response.status == 200 and response.headers.get('Content-Type', '').startswith('image/') and len(response.read()) > 100
        except Exception:
            return False
    urls = {item['new']: item for item in candidates}
    results = dict(zip(urls, concurrent.futures.ThreadPoolExecutor(max_workers=6).map(verify, urls.values())))
    verified = [item for item in candidates if results[item['new']]]
    blocked = [dict(table=item['table'], id=item['id'], field=item['field']) for item in candidates if not results[item['new']]]
    print(json.dumps(dict(candidates=len(candidates), verified=len(verified), blocked=blocked, applying=args.apply), indent=2), flush=True)
    if not args.apply or not verified:
        return
    folder = pathlib.Path(args.backup_dir)
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    backup = folder / ('legacy-storage-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '.json')
    fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as handle:
        json.dump(dict(rows=rows, updates=verified), handle)
    statements = ['BEGIN;']
    for item in verified:
        statements.append(f"UPDATE public.{item['table']} SET {item['field']}={literal(item['new'])} WHERE id={literal(item['id'])} AND {item['field']}={literal(item['old'])};")
    statements.append('COMMIT;')
    query('\n'.join(statements))
    print('Backup: ' + str(backup))
    print('Verified URL updates committed: ' + str(len(verified)))

if __name__ == '__main__':
    main()
