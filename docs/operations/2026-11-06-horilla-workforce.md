# Top100 workforce portal

Target: https://work.top100afl.com on the existing Top100 Dokploy server.
Dokploy project: `top100`, production environment. Compose app: `top100-work-horilla`.
Upstream: https://github.com/horilla/horilla-hr (official image `horilla/horilla-hr:2.3.0`).

## Deployment

Compose source is persisted in Dokploy. Runtime files:
`/etc/dokploy/compose/top100-work-horilla/code/{docker-compose.yml,.env}`.
Supporting configuration is in the sibling `files` directory; retain it when redeploying.
The nginx file mount intentionally points to `../files/nginx.conf`.
The official client settings hook loads `top100_work_guard.HRRecordGuard`. This closes an upstream direct-detail access gap by applying the same employee/subordinate/HR permission filter used by the disciplinary list. Keep both Python bind mounts when updating the image. The permission regression check is in `infra/horilla/verify_privacy.py`.

Root-only administrator credentials: `/etc/dokploy/compose/top100-work-horilla/admin-credentials.json`.
No production secret belongs in Git. Configuration examples and notification code are in `infra/horilla`.

Independent Postgres and Redis, persistent database/static/media volumes, no published database or application ports. Only nginx joins `dokploy-network`. Traefik terminates HTTPS; nginx forwards the original HTTPS scheme to Django. Uploaded media is routed through Django authentication, never a public nginx file alias.

Exactly one Horilla scheduler runs. The web service owns migrations and static collection. Both the scheduler and nginx wait for web health. Time zone is Africa/Lagos. Do not scale the scheduler.

## Initial configuration

Retrieve the administrator username from protected deployment storage. Set `TOP100_WORK_VERIFY_ADMIN_EMAIL` in the environment when running the notification and privacy verification scripts. Complete the administrator employee profile after first login, including name and phone; these were deliberately not invented.

Company: Top100 Africa Future Leaders. Initial project: Top100 Team Operations.
Stages: Assigned, Accepted, In progress, Blocked, Submitted for review, Approved.
Managers must review output before marking Approved. These stages are a configured workflow, not a custom permission enforcement layer.

Initial task: Confirm workforce roster and availability, assigned to the administrator.
Employees should use task timesheets to document evidence links, output, next steps, blockers and ETA. Files can be attached to tasks.

Groups: Top100 Project Manager; Top100 HR Coordinator. Both are unassigned initially. Grant these roles for the Top100 company using company-scoped role assignments; plain global group membership does not grant permissions in this release. Give the HR group only to the nominated coordinator; it includes employee and disciplinary record access. Ordinary staff should not receive broad HR permissions. Review role access using test accounts before onboarding real staff.

Warning types: First written warning, Final written warning, Suspension (manager issued). Login blocking is disabled for these types. No actual disciplinary action is seeded. HR creates actions manually in Employee > Policies and Discipline. The accountability policy is an unpublished draft restricted to the administrator pending management review.

## Notifications

`top100-work-notifications.timer` runs a single service every five minutes on the Dokploy host. Its script executes Django code in the web container. It uses a Postgres advisory lock and the `top100_work_delivery` table to record successful delivery independently for email and in-app channels.

- New task assignment: notice to each active assigned member within five minutes.
- Open tasks due tomorrow/today or overdue: once per day per person/task, after 09:00 Lagos.
- Progress update reminders: Tuesday and Friday after 16:00 Lagos for staff with open assigned tasks.
- Manager-created HR action: private notice to affected active employees within five minutes. Email directs them to the portal without including disciplinary details.
- Completed, approved-stage and archived tasks/projects are excluded.
- No automated warning or suspension decisions.

Email uses the existing Top100 Brevo sender through the active SMTP configuration with TLS. SMTP success means accepted by the provider, not proof of delivery into the inbox. If SMTP accepts a message and the process crashes before recording success, a retry can duplicate that email. The delivery ledger prevents duplicates on ordinary successful runs.

Diagnostic commands on the host:

```sh
cd /etc/dokploy/compose/top100-work-horilla/code
docker compose -p top100-work-horilla ps
docker compose -p top100-work-horilla logs --tail 100 web scheduler
systemctl status top100-work-notifications.timer top100-work-notifications.service
journalctl -u top100-work-notifications.service --since today
```

Do not start a second notifier. Stop notifications with `systemctl stop top100-work-notifications.timer`.

## Backups

`top100-work-backup.timer`: 02:30 Africa/Lagos daily. Database dump, media archive and private configuration archive are stored in `/var/backups/top100-work`, retained for 14 days. This is an on-server recovery copy; an off-server backup destination remains to be configured.

A restore must restore the database (including the notification delivery ledger), media and environment together. Review active timers before a restore to avoid notifications from restored data. Do not replace volumes or run `down -v` during upgrades.

## Rollout

1. Sign in, change the initial password and complete the administrator profile.
2. Review the draft policy and confirm availability/update expectations.
3. Add staff using real information and agreed availability; nominate HR and project managers.
4. Create projects/tasks with one primary owner, reviewer, deadline and acceptance evidence.
5. Test an ordinary staff account: assignments, own progress, notification visibility, HR notice access, and denied access to other staff's private HR information.
6. Publish the agreed policy and begin the pilot.

## Go-live verification

- Public HTTPS sign-in, CSRF form submission and a secure session cookie passed; authenticated task and HR pages returned 200. The origin certificate also validated directly.
- Ordinary assigned employee opened tasks and saved a progress timesheet through the actual application form. Fixture data rolled back.
- Permission regression: upstream direct HR detail access exposed an unrelated employee's record before the guard. With the guard, unrelated access returns 403, while the affected employee, company-scoped HR coordinator and administrator retain access. All fixture data rolled back.
- Notification planning excludes completed, approved and archived tasks. Repeated successful execution produces no duplicate delivery. Test HR actions rolled back and test email delivery was mocked.
- Live notifier sent two channels for the administrator's real roster-confirmation task (one email accepted by SMTP and one in-app notice). The following invocation sent zero channels. There were zero real disciplinary actions at go-live.
- Both systemd services completed successfully and both timers are enabled. First database dump passed `pg_restore --list`; media archive passed `tar -tzf`. This validates archive readability, not a full disaster-recovery restore.
- Existing Top100 website remained HTTP 200. Public resolvers 1.1.1.1 and 8.8.8.8 resolve the workforce domain; local DNS may retain an older negative cache temporarily.

Upstream startup emits a database-access-during-initialization warning and Django shell reports two historical payroll models that cannot be auto-imported. These did not prevent migrations, startup or the exercised task/HR workflows. Payroll processing was not part of this setup's validation.

## Top100 branding

The deployment enables Horilla's white-label mode. The `Top100 Workforce` theme is the default and is assigned to the Top100 company. The shared header and sign-in page use the exact homepage wordmark. The company icon, favicon and sidebar rail use the 100 glyph from that wordmark. The dashboard uses the homepage gradient stops #f97316, #fb923c and #f59e0b. Both images are served by Horilla from `/app/media/base/company/icon/`, the existing public company-asset directory in the persistent media volume.

The web service mounts `../files/top100-login.html` over the image's themed login template. Generate that file by applying `infra/horilla/top100-login.patch` to the upstream image's `/app/horilla_theme/templates/login.html` (verified against 2.3.0). The web service also mounts the setup checklist generated by applying `infra/horilla/top100-setup-checklist.patch` to `/app/base/templates/base/setup_checklist_banner.html`. The header, sidebar and dashboard bind mounts are generated in the same way from their matching `top100-*.patch` files. The shared responsive styles are in `infra/horilla/top100-work.css`. Rebase the patches against the replacement image before upgrades. For a fresh install, copy `infra/horilla/top100-icon.png` and the public Top100 wordmark into that media directory as `top100-icon-v2.png` and `top100-wordmark.png`, then run `infra/horilla/brand.py` via `python manage.py shell` after the company exists.
