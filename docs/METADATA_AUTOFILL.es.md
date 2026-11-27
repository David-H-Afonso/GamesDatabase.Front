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
lo advierte. La confirmación de Reemplazar acepta una vez por ámbito la nota
atribuida de la edición con coincidencia fiable; los lotes de vacíos pueden aceptar
juntas todas las notas cuya única duda sea la plataforma. Una nota que ya coincide
no obliga a revisar otra vez. La nota
atribuida a OpenCritic se identifica como OpenCritic. No se automatiza ni elude
SteamDB: su [FAQ](https://steamdb.info/faq/) prohíbe scraping automatizado. Importar o
sincronizar ya no guarda un porcentaje calculado de usuarios Steam como crítica
SteamDB. No se borran ni reclasifican silenciosamente notas ya guardadas.

Historia/completista usa estimaciones HLTB atribuidas en la misma página pública
de Deku, no tiempo del jugador. La revisión manual enseña las horas originales y
su redondeo a enteros. No hay llamadas directas a HLTB, servicio de pago ni claves
nuevas para las duraciones. Se consulta el título/App ID, no las notas personales ni el tiempo jugado.

### Ediciones e imágenes fuera de Steam

Las coincidencias muestran año y plataforma. No se mezclan conflictos conocidos:
un original de 1998 y un remake homónimo de 2026 requieren elegir edición si tu
juego no tiene año/plataforma. Wikidata usa JSON acotado y alias publicados; una
búsqueda sensible a puntuación tiene una alternativa de descubrimiento por palabras,
no una selección aproximada. Los errores se muestran como fuente no disponible.

Las imágenes priorizan Steam y después SteamGridDB opcional, páginas públicas de
LaunchBox y recursos oficiales/Wikimedia verificados. Logo, hero horizontal y
carátula vertical se comprueban por separado, con bytes y dimensiones reales.
No se reutiliza una carátula como logo o hero. También funciona con exclusivos de
consola. LaunchBox y las fuentes oficiales no necesitan clave; el administrador
puede configurar `STEAMGRIDDB_API_KEY` solo en la API, nunca en el frontend.

Deku se consulta también si faltan fecha o imágenes, aunque crítica y duraciones
ya estén rellenadas. Nunca se usa la editora como si fuera la desarrolladora.

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

La API guarda el trabajo explícito en SQLite. Usa **Continuar en segundo plano**,
cierra la hoja o pulsa Escape para seguir en Biblioteca, Inicio o Administración.
El banner global muestra procesados/total y **Ver detalles / Cancelar autorrellenado**.
Navegar, cerrar sesión o cerrar la web solo detiene la observación, no el trabajo
aceptado. El servidor debe seguir encendido; tras reiniciar la API se retoma lo
pendiente al poder recuperar el lease del proceso anterior (hasta dos minutos).
No se programa un escaneo periódico ni se descubren nuevos juegos automáticamente.

Los resultados separan actualizados, sin cambios, elecciones, parciales, fallidos y
cancelados, y enumeran los campos realmente guardados. La ausencia de HLTB opcional
no es una duda de edición. Se prefiere el título exacto y después una sola
coincidencia cosmética (puntuación, espacios, acentos o marcas), nunca otra secuela,
DLC o remaster. Revisar un juego conserva los demás, el filtro y la lista ampliada;
Volver/Anterior/Dejar pendiente y siguiente mantienen la cola accesible. El menú
de cuenta **Autorrellenado** permite recuperar lotes anteriores, incluidos avisos ocultos.

Solo **Cancelar autorrellenado** detiene lo pendiente. Una transacción iniciada puede
terminar; no se deshace lo guardado. Un juego editado después de encolar el lote
requiere una elección manual nueva, en vez de sobrescribir esos cambios.

**Reintentar información pendiente** hace una consulta nueva solo de los resultados
fallidos, parciales o cancelados. Nunca repite altas/importaciones Steam ni reenvía
automáticamente un guardado incierto. Las pausas de proveedor se guardan y el worker
reintenta lecturas transitorias hasta tres veces por elemento antes de conservar
un resultado fallido/parcial. Guardado y recibo del elemento se confirman en la
misma transacción SQLite: recuperar el trabajo no repite un elemento confirmado.
El envío usa un identificador idempotente; un POST incierto se reconcilia con GET,
no con otro inicio automático. Recargar recupera el estado sin volver a enviarlo.

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

El trabajo persistente anterior es el autorrellenado de metadatos, incluidas sus
propuestas de imágenes. El refresco de un solo rol descrito abajo sigue validando
la carga de imagen en el navegador; no es una tarea desatendida del servidor.

Elige Logo, Hero o Cover y **Refrescar imagen**. Lee el App ID Steam propio actual,
carga un candidato y guarda solo ese rol revisado. No vacía primero la URL, no
sincroniza jugadores ni restaura una URL antigua sobre una edición concurrente.
Sin candidato disponible conserva la URL anterior. Un refresco confirmado de la
misma URL puede reintentar su visualización sin inventar una edición del juego.

Ante conflicto o plan caducado, vuelve a consultar. Tras un guardado interrumpido,
comprueba el juego real. Pruebas y capturas locales no certifican disponibilidad
Steam, hosting, dispositivos físicos ni tecnología de asistencia.
