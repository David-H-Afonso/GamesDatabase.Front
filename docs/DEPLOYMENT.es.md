# Despliegue y recuperación web/API

[English](DEPLOYMENT.md) · [README](../README.es.md)

Es una lista para el operador, no un despliegue ejecutado. Front y API versionan por
separado; actualiza primero la API compatible. Electron es otra distribución y no
queda certificado por este procedimiento web/API.

## Publicar no es desplegar

Los workflows de `master` (Front) y `main` (API) validan versiones de los commits,
instalan/restauran, ejecutan comprobaciones y construyen imágenes. Calidad e imagen
deben pasar antes de publicar la release inmutable del HEAD probado. Las notas
`docs/releases/<versión>.md` / `DOCS/releases/<versión>.md` forman su descripción.
No se mueven ni renumeran tags, releases o artefactos antiguos.

Un push puede publicar tags de versión y `latest`, pero no autoriza arrancar producción,
migrar o restaurar. Revisa antes cualquier actualizador externo automático; no supongas
que existe, está bien configurado o permanece desactivado.

## Antes de cambiar una instancia

1. Registra SHAs/versiones y **digests** nuevos/anteriores, arquitectura, rutas,
   montajes y migraciones realmente pendientes. Comprueba Skia/WebP nativo en la
   imagen Linux final; los tests Windows no lo sustituyen.
2. Acuerda copia y reversión prácticas para esos datos. Pausa escrituras y usa la API
   de backup SQLite o una copia con el servicio parado y tratamiento correcto de WAL.
   Copiar solo el archivo principal de una base viva no es una copia consistente.
3. Calcula hash, comprueba integridad/FKs y restaura a una ruta aislada. Revisa juegos,
   catálogos, listas/capacidad/orden/carpetas, vistas, Replays/historial, preferencias
   y un login representativo sin cambiar contraseñas.
4. Conserva imagen anterior por digest, configuración y montajes. CSV/ZIP complementan,
   no sustituyen, una copia completa SQLite/auth/historial/caché. Backups, exports,
   claves y sesiones nunca van al código o artefacto estático.

## Compatibilidad 3.0 y cambios posteriores

La API usa .NET 10 LTS, Microsoft/EF 10, Swashbuckle 10 y SkiaSharp con assets Linux.
El cambio de runtime/codificador no añade otra migración. Colección añade desarrollador
nullable y preferencias propias Inicio/GOTY con revisión; la guía añade estado propio,
flag inicialmente desactivado para cuentas existentes y procedencia de ejemplos.

`AddLibraryReviewPreferences` añade uso de vistas, modo de tiempo aditivo y versión
de caché; `AddRetrySafeGameCreation` añade recibos internos con índice único cuenta/UUID.
No inventan ediciones de juegos ni reescriben los minutos originales.

La posterior `AddPinnedQuickViews` añade plaza nullable e índice único cuenta/plaza.
Las vistas existentes empiezan sin chincheta, conservando criterios, orden, uso y fechas
de edición. Es un cambio posterior a la imagen API 3.0.0: revisa la migración
del artefacto que vayas a adoptar, no la atribuyas a una imagen antigua. Consultar
duraciones y revisar fechas Steam no necesita otra migración.

El arranque aplica las migraciones EF pendientes automáticamente. Solo una base
realmente vacía inicializa el modelo actual y registra su baseline. Conserva
`__EFMigrationsHistory` y revisa también migraciones anteriores del destino.
Los candidatos de imágenes no guardan juegos ni sincronizan jugadores. Los planes
de metadatos usan claves DataProtection que deben persistirse en privado.

La crítica v2 y las reparaciones acotadas de seguridad no añaden migración. Los
**trabajos persistentes de metadatos sí añaden `AddMetadataAutofillJobs`**: tabla
propia con clave de envío idempotente, recibos y leases. Inclúyela en la copia
SQLite; las transferencias CSV/ZIP no reanudan trabajos en otro servidor. Solo se
retoma trabajo pendiente solicitado expresamente. Mantén la tabla aditiva al
volver al binario anterior: este pausa los trabajos; Down eliminaría cola/historial. Actualiza
primero la API compatible: v2 usa otro propósito de plan para que una API antigua
no aplique OpenCritic como Metacritic. Mantén escrituras nuevas al volver atrás;
no restaures una base antigua solo para descartar un plan de revisión.

El destino del callback Steam debe estar permitido explícitamente por frontend/CORS;
el nonce vincula destino y URL de retorno. Los destinos inválidos ahora fallan
cerrados. La cuota de autenticación usa IP de conexión; proxy/NAT pueden compartirla
hasta configurar de forma deliberada un reenviador de confianza.

ZIP descarga imágenes sin credenciales y con límites. Comprueba el subárbol
`/game-images/` del servidor configurado. Otras rutas privadas necesitan una entrada
estrecha `ExportMedia:AllowedPrivateBaseUrls` en servidor, nunca todo un origen
privado ni debilitar TLS. SVG pasivo y logos raster siguen admitidos; datos antiguos
activos/malformados devuelven404 sin reescribirlos.

## Configuración y orden

- Web: puerto de contenedor80; API:8080. Los puertos de desarrollo son distintos.
- `VITE_API_URL` es la URL visible para el navegador, inyectada mediante `window.ENV`.
  `API_IMAGES_URL` es el upstream del proxy de imágenes que puede alcanzar Nginx.
  `localhost` no significa automáticamente el otro contenedor.
- Conserva en servidor firma JWT, emisor/audiencia, claves Steam y rutas. Revisa
  bootstrap, TLS, CORS/orígenes, cabeceras, límites y exposición antes de compartir acceso.
- Arranca la API compatible; comprueba migración, salud, versión y lecturas propias.
  Después adopta el Front y revisa imágenes, filtros/layouts, Guardar/Cancelar,
  Focus, estanterías, conflictos de Inicio y exports legibles.
- Verifica recibos exactos de fechas y que otra sincronización no mueva un fin guardado.
  Un bloqueo SQLite devuelve `503 databaseBusy` con `Retry-After`: conserva el recibo
  de una importación correcta, sin repetirla entera a ciegas.
- Reiniciar pierde estado temporal de jobs, no juegos ya guardados. Sincronizar
  otra vez requiere una acción explícita; no se presupone trabajo recurrente.

## Reversión

Prefiere una imagen anterior compatible manteniendo el esquema y los datos aditivos.
Down de colección elimina metadatos/preferencias. Las migraciones de uso/recibos/
chinchetas tienen ensayos aislados Up/Down/Up que conservan filas, FKs y el high-water
mark de AUTOINCREMENT mediante DROP COLUMN nativo, pero quitar sus campos pierde
información nueva. Un ensayo no convierte Down en un rollback de producción sin pérdida.

Si hace falta restaurar SQLite, para escrituras y acuerda qué cambios posteriores
se conservan o reconcilian. Presérvalos, restaura solo la copia verificada y comprueba
integridad/FKs e imagen compatible. Nunca descartes cambios recientes silenciosamente.
Corrige una versión publicada hacia delante, sin mover su tag ni reemplazar artefactos.
