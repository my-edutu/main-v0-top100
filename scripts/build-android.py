#!/usr/bin/env python3
"""Build signed Android artifacts without Play credentials; keep signing material outside Git."""
import json
import hashlib
import os
from pathlib import Path
import secrets
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
project = root / 'android'
env = os.environ.copy()
jdk = Path(env.get('JAVA_HOME', '/Applications/Android Studio.app/Contents/jbr/Contents/Home'))
sdk = Path(env.get('ANDROID_HOME', str(Path.home() / 'Library/Android/sdk')))
env.update(JAVA_HOME=str(jdk), ANDROID_HOME=str(sdk), ANDROID_SDK_ROOT=str(sdk))
env['PATH'] = str(jdk / 'bin') + os.pathsep + env.get('PATH', '')
signing = Path(env.get('TOP100_ANDROID_SIGNING_DIR', str(Path.home() / '.android/top100afl-signing')))
signing.mkdir(parents=True, exist_ok=True, mode=0o700)
signing.chmod(0o700)
key = signing / 'upload.jks'
password = signing / 'upload-password.txt'
alias = 'top100afl-upload'

def run(args, **kwargs):
    subprocess.run([str(arg) for arg in args], env=env, check=True, **kwargs)

if not key.exists():
    if password.exists():
        raise SystemExit('Password exists without its key. Restore the key before building.')
    with password.open('x') as file:
        password.chmod(0o600)
        file.write(secrets.token_urlsafe(36))
    run([jdk / 'bin/keytool', '-genkeypair', '-keystore', key, '-storetype', 'JKS',
         '-storepass:file', password, '-keypass:file', password, '-alias', alias,
         '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000',
         '-dname', 'CN=Top100 AFL Android Upload, O=Top100 Africa Future Leaders, C=NG'])
    key.chmod(0o600)
if not password.exists():
    raise SystemExit('Missing signing password. Restore it; do not replace the existing key.')

run(['sh', './gradlew', '--no-daemon', '--console=plain', '--max-workers=2', 'bundleRelease', 'assembleRelease'], cwd=project)
manifest = json.loads((project / 'twa-manifest.json').read_text())
output = root / 'output/android' / manifest['appVersion']
output.mkdir(parents=True, exist_ok=True)
bundle = output / 'top100-afl-release.aab'
shutil.copy2(project / 'app/build/outputs/bundle/release/app-release.aab', bundle)
run([jdk / 'bin/jarsigner', '-keystore', key, '-storepass:file', password,
     '-keypass:file', password, '-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256', bundle, alias])
tools = sdk / 'build-tools/36.0.0'
apk = output / 'top100-afl-release.apk'
aligned = output / 'aligned.apk'
run([tools / 'zipalign', '-f', '4', project / 'app/build/outputs/apk/release/app-release-unsigned.apk', aligned])
run([tools / 'apksigner', 'sign', '--ks', key, '--ks-key-alias', alias,
     '--ks-pass', 'file:' + str(password), '--out', apk, aligned])
aligned.unlink()
run([jdk / 'bin/jarsigner', '-verify', bundle])
run([tools / 'apksigner', 'verify', '--print-certs', apk])
run([jdk / 'bin/keytool', '-exportcert', '-rfc', '-keystore', key, '-storepass:file', password,
     '-alias', alias, '-file', output / 'upload-certificate.pem'])
certificate = subprocess.check_output([str(jdk / 'bin/keytool'), '-exportcert', '-keystore', str(key),
    '-storepass:file', str(password), '-alias', alias], env=env)
digest = hashlib.sha256(certificate).hexdigest().upper()
fingerprint = ':'.join(digest[i:i+2] for i in range(0, len(digest), 2))
(output / 'assetlinks.local-upload.json').write_text(json.dumps([{
    'relation': ['delegate_permission/common.handle_all_urls'],
    'target': {'namespace': 'android_app', 'package_name': manifest['packageId'],
               'sha256_cert_fingerprints': [fingerprint]},
}], indent=2) + '\n')
(output / 'release-info.json').write_text(json.dumps({
    'packageId': manifest['packageId'], 'version': manifest['appVersion'],
    'versionCode': manifest['appVersionCode'], 'uploadCertificateSha256': fingerprint,
    'files': {file.name: hashlib.sha256(file.read_bytes()).hexdigest() for file in [bundle, apk]},
}, indent=2) + '\n')
print(f'Artifacts: {output}\nBack up private signing material: {signing}')
