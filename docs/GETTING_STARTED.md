# Get started with Games Database

[Español](GETTING_STARTED.es.md) · [User guide](USER_GUIDE.md)

This guide runs the web/API pair locally. It does not deploy a production instance.
Use the .NET 10 SDK, Node 22.13+ and npm 10+.

## 1. Obtain both repositories

```sh
git clone https://github.com/David-H-Afonso/GamesDatabase.Api.git
git clone https://github.com/David-H-Afonso/GamesDatabase.Front.git
```

## 2. Configure the API

From `GamesDatabase.Api`, choose an explicit SQLite path and export directory.
Use an empty directory for a first installation. Do not experiment on an existing
personal database; startup applies its pending migrations.

Set these environment variables in your terminal or private configuration store:

| Variable | Local setup |
| --- | --- |
| `GAMESDATABASE_DB_PATH` | Your explicitly intended SQLite path |
| `ExportSettings__DefaultExportPath` | Your private export directory |
| `JWT_SECRET_KEY` | A strong private signing key, at least 32 characters |
| `JWT_ISSUER` / `JWT_AUDIENCE` | Deliberate matching token identities |
| `ASPNETCORE_URLS` | Loopback HTTP on port 5011 for this local example |
| `CorsSettings__AllowedOrigins__0` | The frontend origin you will use |
| `HOUSEHOLD_REDIRECT_URIS` | Required exact callback allowlist; comma-separated, no wildcard |
| `HOUSEHOLD_CLIENT_ID` | Household client identifier if changing the built-in default |

Server secrets are never Front configuration. Use your password manager or secure
environment mechanism for the signing key, rather than a committed sample value.
Do not commit local `.env*`, Development settings, databases or exports.

Startup validates the Household callback allowlist even for a standalone library.
If you are not connecting Household, reserve a non-routable callback such as
`https://household-client.invalid/callback`; do not allow arbitrary redirects to
silence validation. For an actual connection, use the client's exact callback URI
and follow the API's Household integration guide.

```sh
cd GamesDatabase.Api
dotnet restore GamesDatabase.Api.sln
dotnet build GamesDatabase.Api.sln --configuration Release
dotnet test tests/GamesDatabase.Api.Tests/GamesDatabase.Api.Tests.csproj --configuration Release
dotnet run --project GamesDatabase.Api.csproj --no-launch-profile --urls http://127.0.0.1:5011
```

For an empty database, app startup creates the current schema and records the
migration baseline. Use app startup for this first initialization, not a legacy
`dotnet ef database update` against a brand-new file. Existing databases use their
actual pending migrations; back them up first. Verify `/health` and the version.

## 3. Run the Front

In another terminal, from `GamesDatabase.Front`:

```sh
npm ci --include=optional
```

For development, a local `.env` may contain this public URL:

```env
VITE_API_URL=http://127.0.0.1:5011/api
```

```sh
npm run dev
```

Open `http://localhost:5173`, or use 127.0.0.1 consistently if that is your configured
origin. Do not mix origins accidentally when checking CORS or login.

## 4. Create your first library

1. A fresh installation offers the initial administrator. Sign in locally and
   set a password before exposing the service to anyone else.
2. The guide can use your own library or explicitly add six fictional, labelled games
   and one manual playlist. It also offers three useful normal views, retained after
   the guide/cleanup; these can be added without game samples. Reads never create them.
3. Add a game with its title and status. Open its detail to edit the rest.
4. Use playlists, Focus and Home rows as explained in the [User guide](USER_GUIDE.md).
5. At the end of the guide, choose to keep, remove or decide later about examples.

Edited examples are retained by default. Cleanup reviews IDs/timestamps; mixed
playlists and other games remain. If another edit occurs, reload and review again.

## 5. Add another user

From the administrator's profile, open **Users** and create an account. Choose its
role/password and whether to show the getting-started guide. Creating an account
does not sign in as it or add game examples. Existing users can restart the guide
from their profile; an administrator can enable it in Edit user.

## 6. Verify a compiled build

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 5174 --strictPort
```

Preview does not use Vite's development `/game-images` proxy. Configure its public
API/runtime URL and a suitable image upstream if checking real API images. Cypress
intercepts APIs and uses local fixtures instead:

```sh
npm run cypress:run -- --browser electron --config baseUrl=http://127.0.0.1:5174
```

## Existing data and production

Read [Deployment and recovery](DEPLOYMENT.md) before adopting images. Agree the
actual paths, WAL-safe backup, isolated restore and prior image digest. A Git push
can publish tags/images; it does not authorize a deployment or data restore.

For problems, check API URL, origin, loopback ports and image proxy independently.
Do not solve an isolated test failure by connecting it to production data.
