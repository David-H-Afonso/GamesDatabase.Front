# Usar Games Database

[English](USER_GUIDE.md) · [Instalación](GETTING_STARTED.es.md)

## Cuenta y primeros pasos

El perfil contiene apariencia, herramientas de datos, administración y guía.
Los administradores también ven Usuarios. Cada cuenta tiene juegos, catálogos,
vistas, playlists y preferencias propios.

La guía puede mostrarse a usuarios nuevos. Elige tu biblioteca o acepta seis
ejemplos ficticios. Puedes pausar, reanudar o empezar de nuevo desde el perfil.
El progreso de guía registra capítulos, no completado de juegos.

Los ejemplos se identifican en Biblioteca y ficha, y cuentan como registros hasta
conservarlos o borrarlos. **Gestionar datos de ejemplo** revisa el lote actual.
Se conservan por defecto los editados; borrarlos también requiere aceptación.
Las playlists con otros juegos sobreviven y otro cambio exige una nueva revisión.
Conservar convierte los ejemplos en registros ordinarios sin borrar datos.

## Añadir y editar

1. Usa **Añadir juego**. Indica título y estado; los demás metadatos son opcionales.
2. Abre imagen o título para ver la ficha.
3. **Editar ficha** tiene cuatro pestañas:
   - **Tu partida:** estado, acompañantes, fechas, tiempo manual, notas y completado/favorito.
   - **Juego:** título, plataforma, salida, nota personal, crítica y duraciones.
   - **Imágenes:** Logo/Hero/Cover, previews, Steam App ID y tienda.
   - **Estudio:** desarrolladora/estudio.
4. **Guardar cambios** envía campos cambiados; **Cancelar** descarta el borrador.

El App ID vinculado comienza bloqueado. Desbloquéalo para cambiarlo. Consultar
imágenes afecta solo al rol del borrador y no sincroniza al jugador. Un fallo
conserva la URL anterior. Las imágenes se ven antes de guardar.

El modal compacto **Añadir Juego** empieza solo con título e icono Steam al lado.
El icono activa la búsqueda de ese título (gris desactivado, a color activado);
elegir un resultado lo vincula. Sin elegirlo se añade el título manualmente.
La flecha despliega plataforma, estado y preferencia de precio; plegarla conserva
esos ajustes. **Añadir otra fila** crea un lote sin repetir formularios abiertos
ni descartar otro título escrito. Ante un fallo parcial, las filas
guardadas siguen marcadas y solo se reintentan las pendientes. Si fallan los
ajustes posteriores a una importación Steam, no se vuelve a importar. Las altas
manuales llevan un UUID propio para no duplicar el mismo registro al reintentar.
Cerrar/reabrir conserva este borrador en memoria; recargar la página no.

## Rellenar información automáticamente

Abre **Opciones del juego** (tres puntos) y **Rellenar información automáticamente**.

1. Elige vacíos/sobrescribir y si incluir imágenes.
2. Busca. Si hay títulos/ediciones ambiguos, selecciona la identidad correcta.
3. Revisa valor actual/propuesto y fuente por campo.
4. Desmarca lo que no quieras y **Guardar campos seleccionados**.

Se prioriza Steam y se usa Wikidata para datos ausentes. No cambia nota personal,
comentario, estado, tiempo, progreso ni App ID. Steam playtime no se usa como
duración de historia/completista. La falta/ambigüedad de fuentes conserva campos.
Un juego cambiado o revisión caducada requiere buscar de nuevo. Cancelar no aplica.

## Búsqueda, filtros y layouts

- **Ctrl/Cmd+K** busca juegos, playlists, carpetas y secciones desde el header.
- La búsqueda de Biblioteca es independiente y por nombre; `/` la enfoca.
- La búsqueda avanzada admite frases literales, cualquiera/todas, exclusiones y
  sensibilidad a mayúsculas/acentos independiente.
- **Filtros** abre un borrador. **Ver juegos** cambia la consulta; cerrar la conserva.
  **Restablecer** reinicia criterios y aún requiere Ver juegos. El indicador cuenta
  criterios aplicados, no ediciones pendientes, orden ni paginación.
- Cambia entre **Covers**, **Cards** y **Row**. Cards permite tres/cuatro columnas
  si hay anchura; esta preferencia de presentación se aplica inmediatamente.
  Row ampliado añade columnas. Nota y Crítica usan /100; Score calculado /10.
- Las vistas guardadas conservan filtros/orden. Los atajos son las dos últimas
  usadas, o las dos primeras inicialmente. Reutilizarlas no cambia su posición.

El favorito activo siempre se ve; el inactivo aparece al pasar el puntero, enfocar
o usar touch. En modo selección se pulsa toda la tarjeta/fila o se usa su checkbox
con teclado, sin abrir ficha ni metadatos. La barra reúne Editar y las demás
acciones por lotes. Revisa los IDs antes de borrar o refrescar/sincronizar imágenes.
Cambiar página/consulta limpia la selección anterior.

## Playlists, carpetas, estanterías y Focus

Las manuales guardan juegos/orden elegidos. Las automáticas siguen filtros;
las plantillas son puntos de partida editables. Capacidad y preview son distintos.
Quitar de una playlist no elimina el juego.

Los menús de playlists ofrecen Editar/Mover sin entrar antes en checks. Los menús
y tiradores de sus juegos ordenan pertenencia; vuelve a Orden de la playlist
antes de mover desde otra ordenación visual. Se conserva la selección múltiple.
Las carpetas organizan playlists mediante drag/drop o controles Mover. Borrar
una carpeta desagrupa las listas. Estanterías presenta las manuales y sus juegos,
no otro catálogo.

Focus es una cola manual pequeña, normalmente cuatro huecos. Añade/gestiona
desde ficha o página Focus. Ordenar/quitar/elegir es explícito. Cambiar destacado
no cambia el orden ni el estado.

## Inicio y recomendaciones

**Personalizar** añade/oculta/ordena filas de playlists, vistas, filtros,
Jugando/estadísticas o recomendaciones. **Guardar fila** actualiza el borrador;
**Guardar inicio** conserva la composición. Quitar fila no borra su origen.
**Ver todos** abre el origen completo, independientemente de la preview.

Jugando ahora sigue el rol Jugando. La lista lateral destaca juegos; abrir ficha
es otra acción. Recomendaciones usa estados normales, no especiales, por defecto.
Los incluidos definen el conjunto y las exclusiones ganan. Todos comparten
**00:00 UTC**, pero solo ven su colección. Una selección pequeña puede repetir
juegos; el orden rota cada día.

El dado está en perfil y header de escritorio. Elige **Toda la biblioteca** o
**Juegos mostrados**: solo los IDs de la página actual, no todas las coincidencias
de sus filtros. Biblioteca y playlists registran ese ámbito; la preview mixta de
Inicio no inventa uno. Un conjunto obsoleto/ajeno falla sin ampliarse.
Elegir no cambia estado ni inicia sincronización.

## Progreso, Replays y estadísticas

El tiempo manual positivo sustituye a Steam salvo al activar **Sumar tiempo manual
a Steam**. Cero/vacío recupera Steam automático. Un Steam desconocido sigue siendo
desconocido, no un cero inventado. El límite manual es 600.000 minutos (10.000 horas).
Historia/completista son estimaciones en horas, no porcentajes ni Steam playtime.

Replays guarda tipo, fechas, nota y comentarios propios. Historial registra cambios,
no sesiones. Estadísticas usa toda la colección, fechas y logros guardados.
GOTY es una elección explícita de un juego fechado elegible, no la mayor nota automática.

Completado incluye marca manual, conservado o conjuntos. 100% estricto exige todos
los logros públicos actuales de juego/DLC, excluyendo contenido archivado. En
no-Steam se conserva la declaración manual. Una duración no establece completado.

## Steam y herramientas de datos

Vincula Steam y sincroniza jugadores solo cuando quieras. El lote inicia un job
explícito; recuperar progreso no lo repite. Reiniciar API pierde estado temporal,
no juegos ya guardados.

El tiempo Steam y última sincronización aparecen encima de los conjuntos de logros,
separando juego base y DLC. **Jugar en Steam** usa `steam://rungameid/<id>` validado
y requiere un cliente compatible instalado. Abrir la ficha no sigue el enlace.

CSV/JSON/ZIP tienen ámbitos diferentes. Para recuperar auth/historial/caché
completos sigue haciendo falta una copia SQLite consistente con WAL y restauración
aislada. Nunca restaures sobre cambios más recientes sin acordar reconciliación.

## Errores y conflictos

- Reintenta lecturas explícitamente; un origen ausente no se cambia por toda la biblioteca.
- Ante409, recarga y revisa el borrador.
- Un save fallido conserva borrador/selección; no repite mutaciones automáticamente.
- Reporta ruta, pasos, resultado esperado/real, navegador y versión. No adjuntes
  tokens, env privados o bases a un issue público.
