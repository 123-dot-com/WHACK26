# Deploy BULLISH to Railway

The app runs on a single HTTPS domain: Express serves the React build and `/api`.
PostgreSQL runs as a separate service, storing game progress on its database volume.
The Dockerfile uses Node 24; deploying from GitHub does not require Node or Docker
to be installed on your computer.

## 1. Push your changes to GitHub

Open PowerShell in `D:\WHACK26`. Review the diff, then commit the deployment files:

```powershell
git diff
git add Dockerfile .dockerignore railway.json DEPLOY_RAILWAY.md SETUP.md package.json apps/server/src/app.ts apps/server/src/index.ts apps/server/src/lib/env.ts apps/server/src/routes/health.routes.ts apps/server/src/tests/health.integration.test.ts
git commit -m "Prepare Railway deployment"
git push -u origin HEAD
git branch --show-current
```

The remote for this checkout is `https://github.com/minhkhang2212/WHACK26.git`.
Note the branch name printed by the last command so you can select it on Railway.
The `.env` file containing local configuration is excluded from Git and the Docker
build context.

## 2. Create a project and PostgreSQL database

1. Sign in to [Railway](https://railway.com) with GitHub.
2. Choose a suitable workspace and paid plan. Hobby costs a minimum of USD 5/month
   and includes USD 5 of resource usage; usage above that amount costs extra. Check
   the [current pricing](https://docs.railway.com/pricing/plans).
3. Select **New Project → Empty Project** and name it, for example, `bullish`.
4. Inside the project, select **New → Database → PostgreSQL**. Keep the service
   name as `Postgres`.
5. Wait for the database to become available and confirm that the service has a
   volume. Place the app and database in the same region to use private networking
   and reduce latency.

The new cloud database starts empty; game data in your local PostgreSQL database
is not transferred automatically. The steps below create the schema and initial
stock catalog.

## 3. Add the app from GitHub

1. In the same project, select **New → GitHub Repo**, then choose
   `minhkhang2212/WHACK26`.
2. If the repository is missing, grant the Railway GitHub App access to it.
3. Open the app service → **Settings → Source** and select the branch pushed in
   step 1.
4. Leave **Root Directory** empty or set it to `/`: the build needs both `apps`
   and `packages`.
5. Let Railway use the `Dockerfile` and `railway.json` at the repository root.
   Leave custom Build Command and Start Command settings unset unless you need
   to override them.

The first automatic deployment may fail before `DATABASE_URL` is configured.
Complete steps 4–5 and deploy again; do not use your local database connection
string in the cloud.

## 4. Configure environment variables and the domain

In the app service's **Variables** tab, add:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |

`DATABASE_URL` references the `Postgres` service using its private address. If you
rename the database service, use its new name in the reference. You can use
**Add Reference** to select the value without copying the password.

In the app service, open **Settings → Networking → Public Networking → Generate
Domain**. If prompted for a target port, enter `8080`. Copy the generated HTTPS
address, then add `CORS_ORIGIN` with the full address and no trailing `/`:

```text
CORS_ORIGIN=https://your-domain.up.railway.app
```

Replace the example address with your actual domain. These settings belong to the
app service; the database uses a private connection and does not need an HTTP domain.

## 5. Deploy and check the logs

Apply pending changes with **Deploy**. If needed, use **Redeploy** on the latest
deployment. Open the logs and check each stage:

1. **Build**: `npm ci` and `npm run build` complete successfully.
2. **Pre-deploy**: `npm run db:deploy && npm run db:seed` completes successfully.
3. **Deploy**: the container runs migration and seed again as a startup fallback,
   then logs `Server listening on port 8080`, and the health check succeeds.

The Docker startup command initializes the database even if Railway's pre-deploy
hook is not applied. Leave the custom Start Command unset so Railway uses the
Dockerfile command. If startup initialization fails, the server does not start.

`prisma migrate deploy` applies committed migrations. The seed uses `upsert` for
the three stocks, so it can run again without resetting saved games. Do not run
`migrate dev` or `migrate reset` against the production database.

The `/api/health` endpoint checks that the database has the `Stock` table and all
three required stocks before returning success. `/api/health/live` checks only
that the server is running. Railway uses the readiness check during deployment.
To receive alerts about later outages, set up
an uptime monitor for the health URL and enable Railway failure notifications.

## 6. Verify the website

Open `https://DOMAIN/api/health`. Expected response:

```json
{"success":true,"data":{"status":"ok","database":"connected"}}
```

Open the main domain, create a game, and play through it. Refreshing `/Room` or
`/Bank` directly should still load the interface. Play all three days, check the
reports, and reload the page. Then redeploy the app service and confirm that the
game is still available in the same browser and domain. The browser stores game
access information, so use the same browser profile for this check.

## 7. Enable backups and monitor costs

1. Open **Postgres → Backups** and enable **Daily** and **Weekly** schedules.
2. Create a manual backup after a successful deployment.
3. Keep an additional database export outside Railway if the data needs to be
   retained long term. Test restoring it to a test database before you need it
   for recovery.
4. Open **Usage/Billing** and enable spending alerts for your budget. If you set
   a hard limit, review how services are stopped when that limit is reached.
5. To keep the app running continuously, disable **Serverless/App Sleeping** if
   it is enabled and you want to avoid startup delays after periods of inactivity.

Daily backups are currently retained for 6 days and weekly backups for 27 days;
backup storage costs extra. Check the [backup documentation](https://docs.railway.com/volumes/backups)
when configuring schedules.

## 8. Deploy future updates

Commit and push to the connected branch. Railway automatically builds and deploys
the new version, running migrations and the seed before serving requests. Back up
the database before migrations that change data; rolling back code does not
automatically undo database schema or data changes.

If you add a custom domain, configure it on Railway and update `CORS_ORIGIN` to
the domain players use. Saved games remain in the database, but browser storage
is separate for each domain, so the new domain will not automatically restore
an existing browser session.

## Troubleshooting

If starting a game returns HTTP 500 and the logs show `P2021` or
`The table public.Stock does not exist`, the database used by the app has not
been migrated. A working database connection alone is insufficient.

To repair an existing deployment without waiting for a code update:

1. In the **app service**, confirm `DATABASE_URL=${{Postgres.DATABASE_URL}}`.
2. Open **Settings → Deploy → Pre-deploy Command** and set:

   ```sh
   npm run db:deploy && npm run db:seed
   ```

3. Redeploy the app service. Confirm the migration and seed commands succeed
   before retrying **Start your run**. Changing the command requires a redeploy;
   restarting the existing container alone does not apply a new pre-deploy hook.

Alternatively, after pushing the updated Dockerfile, clear any custom Start
Command and deploy the new commit to use the startup fallback.

| Symptom | What to check |
| --- | --- |
| Workspace/shared package not found | Root Directory points to the repository root; all required files were pushed |
| Missing `DATABASE_URL` or `ENOTFOUND` | Database reference, correct service name, same project and environment |
| Pre-deploy failure | Migration/seed logs and PostgreSQL service status |
| Starting a game returns HTTP 500 with `P2021` | Run migration and seed against the app service's database, then redeploy |
| Application failed to respond | `PORT=8080`, domain target port is 8080, startup logs |
| Home page works but refreshing `/Room` fails | Express changes are deployed and `NODE_ENV=production` |
| API returns HTML | Correct deployment, `/api` path, production server instead of the Vite dev server |

References: [config as code](https://docs.railway.com/config-as-code/reference),
[pre-deploy](https://docs.railway.com/deployments/pre-deploy-command),
[reference variables](https://docs.railway.com/variables/reference),
[public networking](https://docs.railway.com/networking/public-networking).
