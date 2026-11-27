# Revisión de metadatos y autorrellenado por lotes

[English](METADATA_AUTOFILL.md) · [Guía de uso](USER_GUIDE.es.md)

Son funciones del código fuente. Comprueba en el README qué está publicado y
actualiza primero la API compatible; las versiones anteriores no implementan toda
la revisión v2.

## Revisar un juego

Abre **Opciones del juego → Rellenar información automáticamente**. Por defecto
rellena vacíos. Elige si incluir crítica, imágenes y estimaciones de duración;
busca y revisa edición, valores actuales/propuestos y enlaces. Solo se guardan los
campos marcados.

**Sobrescribir campos rellenados** vuelve a buscar los grupos marcados aunque
ya tengan datos. La revisión v2 pide datos frescos de Deku en vez de reutilizar la
caché analizada de 24 horas. Se respetan bloqueos, pausas y límites de proveedor.
Un dato ausente nunca autoriza vaciar un campo. Confirmar un valor que ya coincide
no inventa una fecha de edición ni una entrada de historial.

### Procedencia de la crítica

El orden es **Metacritic de la edición Steam → Metacritic publicado en Deku Deals →
OpenCritic publicado en Deku Deals**. El juego conserva el proveedor real, no el
predeterminado de la cuenta. Crítica usa /100; el indicador contiguo de usuarios de
Metacritic no es una nota de crítica.

La edición que muestra Deku puede ser de otra plataforma. Su propuesta Metacritic
lo advierte y requiere revisión deliberada dentro de un lote automático. La nota
atribuida a OpenCritic se identifica como OpenCritic. No se automatiza ni elude
SteamDB: su [FAQ](https://steamdb.info/faq/) prohíbe scraping automatizado. Importar o
sincronizar ya no guarda un porcentaje calculado de usuarios Steam como crítica
SteamDB. No se borran ni reclasifican silenciosamente notas ya guardadas.

Historia/completista usa estimaciones HLTB atribuidas en la misma página pública
de Deku, no tiempo del jugador. La revisión manual enseña las horas originales y
su redondeo a enteros. No hay llamadas directas a HLTB, servicio de pago ni claves
nuevas. Se consulta el título/App ID, no las notas personales ni el tiempo jugado.

La búsqueda de Deku incluye explícitamente su catálogo Nintendo, PlayStation,
Xbox y Steam, sin aceptar el filtro anónimo predeterminado de Switch/Switch 2.
Eso amplía la búsqueda, no confirma la edición: los títulos ambiguos siguen
requiriendo elección y se conserva la advertencia de plataforma. Si la página
omite Completista, queda sin propuesta; no se sustituye por Historia + Extras.

## Rellenar juegos seleccionados

1. Activa selección en Biblioteca y marca los juegos en Covers, Cards o Row.
2. Usa la acción visible con rayo **Autorrellenar**. Por defecto rellena vacíos.
3. Para reemplazar metadatos existentes, activa **Reemplazar** y acepta la
   advertencia. Esto solo habilita el modo; después debes ejecutar Autorrellenar.

El lote fija esos IDs exactos, no resultados futuros del filtro ni páginas ocultas.
Cambiar cuenta/consulta/selección o terminar una ejecución reinicia el permiso de
reemplazo. Aplica las propuestas fiables sin adivinar identidades ambiguas. No
enriquece nota personal, notas, estado, fechas de partida, tiempo, logros ni vínculo
Steam. Las acciones secundarias pasan al desbordamiento accesible solo cuando no
caben; los buscadores de Biblioteca y global siguen siendo independientes.

La hoja conserva resultados por juego: rellenado, coincidente/sin campos nuevos,
necesita revisión, parcial, fallo o sin procesar. Detener cancela consultas/esperas
y juegos pendientes; un guardado en curso queda protegido hasta terminar. Salir
de la ruta detiene el resto tras el resultado del guardado actual. Cambiar de cuenta
o desmontar cancela el trabajo restante. No se deshacen cambios ya confirmados y
perder una respuesta no demuestra que el guardado fallara.

**Reintentar información pendiente** hace una consulta nueva solo de los resultados
fallidos, parciales o cancelados. Nunca repite altas/importaciones Steam ni reenvía
automáticamente un guardado incierto. Una espera breve por 429 puede reintentar la
lectura una vez; no acorta un Retry-After mayor. La cola vive en memoria, no es una
tarea persistente ni programada. Recargar no la reanuda automáticamente.

## Activarlo tras añadir/importar

Al final de **Añadir juego**, marca **Intentar rellenar información tras importar**.
Tras confirmar altas/importaciones y sus ajustes, inicia el mismo lote de vacíos
con los IDs nuevos/vinculados confirmados. Un recibo existente/omitido no autoriza
sobrescribir ese registro.

La opción empieza desmarcada en cada lote nuevo. Un fallo de información no elimina
juegos añadidos ni vínculos Steam. Si no puede iniciarse, se conservan los recibos
correctos y terminar no repite esas altas/importaciones. Los borradores cerrados
solo viven en memoria. Únicamente la preferencia explícita Steam activado/desactivado
se conserva por cuenta como booleano, nunca títulos, borradores o sesiones. Al abrir
se enfoca el título.

## Refrescar imágenes por separado

Elige Logo, Hero o Cover y **Refrescar imagen**. Lee el App ID Steam propio actual,
carga un candidato y guarda solo ese rol revisado. No vacía primero la URL, no
sincroniza jugadores ni restaura una URL antigua sobre una edición concurrente.
Sin candidato disponible conserva la URL anterior. Un refresco confirmado de la
misma URL puede reintentar su visualización sin inventar una edición del juego.

Ante conflicto o plan caducado, vuelve a consultar. Tras un guardado interrumpido,
comprueba el juego real. Pruebas y capturas locales no certifican disponibilidad
Steam, hosting, dispositivos físicos ni tecnología de asistencia.
