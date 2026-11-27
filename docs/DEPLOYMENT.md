# Web/API deployment and recovery

[Español](DEPLOYMENT.es.md) · [README](../README.md)

This is an operator checklist, not an executed deployment. Web and API images
version independently; adopt the compatible API before the Front. Electron is a
separate distribution and is not covered by this web/API checklist.

## Publication versus deployment

The Front `master` and API `main` workflows validate outgoing commit versions,
install/restore, run the repository checks and build their images. Successful
quality and image jobs gate the immutable GitHub release for the exact tested HEAD.
Prepared `docs/releases/<version>.md` notes become its release body. Old releases,
tags and artifacts must never be replaced or renumbered in place.

A push can publish new version and `latest` image tags. Publication does not itself
authorize a production startup, migration or restore. Inventory any external
automatic-update service before pushing; do not assume it is absent or configured.

## Before changing a production instance

1. Record the intended source SHAs/versions and new/prior image **digests**.
   Review the actual target architecture and validate native Skia image decoding
   and WebP output in the built Linux image. Windows tests are not that smoke test.
2. Inventory the actual database, image/export/cache paths, mounts, configuration
   names, write traffic and pending EF migration list. Docker defaults are not
   proof of an instance's real paths. Never store JWT/Steam credentials in the Front.
3. Agree an exact practical backup and rollback procedure before startup. Quiesce
   writes and use SQLite's backup API, or an agreed stopped-service copy with
   correct WAL handling. Copying only a live main DB is not a consistent backup.
4. Hash the backup, check SQLite integrity/FKs and restore it to an isolated path.
   Verify owned games, catalogs, playlists/order/folders, views, Replays/history,
   preferences and a representative login without changing passwords.
5. Retain the prior image by digest with its configuration and mounts. CSV/ZIP is
   supplemental, not a complete SQLite/auth/history/cache backup. Keep backups,
   exports, signing keys and sessions out of source/static artifacts.

## 3.0 compatibility

The API uses .NET 10 LTS, Microsoft/EF 10, Swashbuckle 10 and SkiaSharp/Linux native
assets. Runtime and image-library updates do not introduce another migration.
The generated collection migration adds nullable explicit developer and owned
Home/GOTY preferences/revision. Onboarding adds owned state, a default-false guide
flag for existing users and sample provenance/artwork fields.
`AddLibraryReviewPreferences` adds view usage, additive-time mode and export metadata
cache version; `AddRetrySafeGameCreation` adds internal retry receipts with an
owner/key unique index. Neither invents a game edit or rewrites stored raw time.
The later `AddPinnedQuickViews` adds a nullable pin slot and unique owner/slot index;
existing views start unpinned without changing filters, order, usage or edit dates.
Review this post-3.0.0 migration separately from the original API 3.0.0
image. Duration lookup and reviewed Steam dates add no schema migration.
Review older pending migrations too, rather than assuming every destination has
the same schema. Keep `__EFMigrationsHistory` intact.

Startup applies pending EF migrations automatically. New artwork candidate reads
do not save a game or sync its player. Home/GOTY revision conflicts require an
explicit reload/review. Do not sync Steam or invent missing data to make checks pass.
Only a genuinely empty database initializes the current model/migration baseline.
Metadata review plans use private DataProtection keys; persist them intentionally.

Critic review v2 and the scoped security repairs add no migration. The newer
**persistent metadata jobs DO add `AddMetadataAutofillJobs`**, an owned job table
with an idempotent request key, item receipts and process leases. Back it up with
the SQLite database; CSV/ZIP library transfers do not resume jobs on another server.
Only explicitly requested unfinished work resumes after startup. Retain the additive
table on binary rollback: an older API pauses jobs rather than executing them, and
running this migration Down would delete work/history. Adopt the compatible API
before using attributed review v2; it separates its plan purpose from v1 so an old
server cannot misapply an OpenCritic plan as Metacritic. Keep new writes on rollback;
do not restore an old DB merely to discard a review plan.

Steam callback destinations must be explicitly permitted by the configured frontend/
CORS policy; nonce state binds the destination and return URL. Invalid destinations
now fail closed. Auth quotas use the connection IP, so a reverse proxy/NAT can share
a bucket until trusted forwarding is deliberately configured.

ZIP uses credential-free bounded image downloads. Confirm the configured image
server's `/game-images/` subtree; other private media paths need a narrow server-side
`ExportMedia:AllowedPrivateBaseUrls` entry. Do not permit a whole private origin or
weaken TLS to bypass a rejection. Passive platform SVG/raster logos remain supported;
active/malformed legacy values return404 without rewriting stored data.

## Configuration and startup order

- Web defaults to port 80; API to container port 8080. Development ports are separate.
- `VITE_API_URL` is the browser-visible API location, injected through `window.ENV`.
  `API_IMAGES_URL` is the upstream image-proxy location reachable from Nginx.
  `localhost` in a browser or container does not automatically mean another service.
- Keep the server's `JWT_SECRET_KEY`, issuer/audience, Steam keys and data paths
  private and intentional. Review bootstrap credentials, TLS, origins/CORS,
  headers, rate/load limits and network exposure before broader access.
- Start the compatible API, confirm migrations, `/health`, version and owned reads,
  then adopt the matching Front. Verify images, Library filters/layouts, draft
  Save/Cancel, Focus, shelves, Home conflicts and readable exports.
- An API restart loses in-memory sync-operation status, not already saved game
  data. Starting a new player sync remains an explicit action.
- Verify exact date-save receipts and an unchanged saved finish after later sync.
  SQLite contention is `503 databaseBusy` with `Retry-After`, not invalid input;
  retain a successful import receipt instead of blindly resubmitting it.

## Rollback

Prefer a rehearsed prior compatible image while retaining additive schema/data.
Running the collection migration Down drops new metadata/preferences; it is not
a production-preserving rollback after users have written those fields.

The two review/receipt migrations have isolated Up/Down/Up tests that preserve
business rows, foreign keys and SQLite's AUTOINCREMENT high-water mark with native
column drops. That rehearsal does not make removing newer mode/usage/receipt data
a lossless production rollback. Prefer retaining additive schema on a compatible
prior artifact; restoring a backup needs a separate reviewed write-reconciliation plan.

If a DB restore is needed, stop writes and explicitly agree which newer writes
would be lost or reconciled. Preserve them, restore only the verified agreed
backup, check integrity/FKs and start the compatible image. Never silently discard
subsequent user changes. Fix an already published version forward with a new commit.

## Español

Publicar no es desplegar. Un push puede producir tags de imagen nuevos y `latest`;
revisa cualquier actualización externa automática antes de subir. Los workflows
publican solo el commit probado y no renumeran releases existentes. Electron queda
fuera de este alcance.

Antes de arrancar producción, registra versiones/SHAs/digests y rutas/volúmenes
reales. Acuerda una copia SQLite consistente con WAL, pausa escrituras cuando
corresponda y prueba una restauración aislada con integridad/FKs, datos propios,
orden y login. Conserva la imagen anterior por digest. CSV/ZIP no sustituye una
copia completa, y los backups/sesiones/claves no pertenecen al artefacto web.

La API 3.0 usa .NET 10 y añade el desarrollador nullable y preferencias propias de
Inicio/GOTY. La guía añade estado propio, la opción desactivada para cuentas
existentes y procedencia de ejemplos. Las migraciones de revisión añaden uso de
vistas, modo aditivo, versión de caché y recibos de alta únicos por propietario.
No reescriben tiempos crudos ni inventan ediciones. Sus Down se ensayan aislados
conservando filas, FKs y secuencia SQLite, pero borran los nuevos campos: no son un
rollback sin pérdida para producción. El arranque aplica las migraciones pendientes:
revisa la lista real del destino. Solo una base vacía inicializa el modelo y registra
su baseline. Conserva las claves DataProtection en una ubicación privada. Comprueba
la imagen Linux y su conversión nativa, no solo la build Windows.

Configura por separado la URL pública del navegador y el proxy que alcanza Nginx;
`localhost` no representa otro contenedor. Mantén las credenciales en el servidor
y revisa bootstrap, TLS/CORS/headers/límites/exposición. Actualiza primero la API,
comprueba salud/versión/lecturas y después el Front.

Para volver atrás, conserva el esquema aditivo si es compatible con la imagen
anterior. Down elimina datos nuevos y no se ejecuta automáticamente. Si hace falta
restaurar SQLite, acuerda cómo conservar o reconciliar escrituras posteriores,
restaura solo la copia verificada y comprueba de nuevo. Nunca sobrescribas cambios
recientes ni muevas un tag publicado; corrige hacia delante con otra versión.

La guía completa en español, incluida la migración local de chinchetas, está en
[Despliegue y recuperación](DEPLOYMENT.es.md).
