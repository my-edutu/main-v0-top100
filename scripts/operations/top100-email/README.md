# Top100 Email on Dokploy

This directory versions the standalone Listmonk service for `email.top100afl.com`. It contains the compose definition, the Traefik routes, the admin and subscriber styles, and the default campaign template. The separate Listmonk instance used by the Top100 admin gateway has its own compose file in the parent directory.

The standalone compose project is `top100-email-standalone`. The active compose and Traefik files are:

- `/etc/dokploy/compose/top100-email-standalone/code/docker-compose.yml`
- `/etc/dokploy/traefik/dynamic/top100-email-standalone.yml`

From this directory on the Dokploy host, run `python3 sync-appearance.py` to check the assets against production. Add `--apply` to sync a changed design during a window with no running or scheduled campaigns. If the assets already match, the script exits without restarting the service.

Dokploy builds the main Top100 app from GitHub `main`. The standalone Listmonk instance stores its appearance in its own database, so a push does not apply future appearance changes by itself. Configure SMTP credentials and the browser access gate through the existing production secret locations. Subscriber and campaign data belong in Listmonk's database.
