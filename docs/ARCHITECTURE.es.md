# Arquitectura del Front

Games Database es una SPA React 19/TypeScript. Vite genera el artefacto estático;
la API ASP.NET Core mantiene persistencia, permisos e integraciones.

```text
Rutas / app shells
  Header · Inicio · Biblioteca · Focus · Playlists · Estadísticas
    Componentes y hooks de datos propios
      Servicios y contratos TypeScript
        customFetch (sesión, cancelación, timeout)
          Games Database API
```

## Límites

- `src/components/Collection`: Inicio, estadísticas, estanterías, ficha/editor,
  metadatos y sheets nativas compartidas.
- `src/components/Home`: Biblioteca completa, filtros, vistas y acciones por lotes.
- `src/components/Onboarding`: coordinación de la guía por cuenta y capítulos.
- `src/components/Admin`: catálogos/herramientas propias y usuarios privilegiados.
- `src/models/api`, `src/services`, `src/environments/apiRoutes.ts`: contratos HTTP.
- `src/store`: catálogos/consultas compartidos, auth y apariencia local.

Las lecturas se identifican por cuenta/consulta. Se cancelan las antiguas y una
respuesta de otra cuenta no sustituye los datos actuales. Las mutaciones aceptan
su resultado autoritativo. Los datos privados se limpian al cambiar de cuenta;
la apariencia se conserva.

## Hosts de flujos

La selección de ficha y metadatos vive fuera de las tarjetas reemplazables.
Actualizar una consulta no destruye un flujo abierto. Selección y callbacks de
cierre tienen ámbito de propietario. Header conserva un fallback propio para el
shell Admin. Focus mantiene su propio detalle validado y acepta sus lecturas y
mutaciones, sin sustituir la cola por cambios de la caché global de playlists.

El editor guarda un borrador y envía un patch parcial. Consultar imágenes o
metadatos no sincroniza jugadores. Aplicar metadatos usa el plan firmado del
servidor y comprueba el timestamp revisado.
Las duraciones opcionales incluyen `sourceHours` público exacto y una propuesta
redondeada a horas enteras. Nunca se convierten horas Steam en una estimación.

`GameMetadataProvider` observa trabajos propios persistentes fuera del router.
`useMetadataAutofillJob` recupera estado/historial, consulta solo trabajo activo y
rechaza resultados de otra cuenta/generación. Header oculta superficies al navegar,
sin cancelar. La API fija los IDs y confirma cada Apply firmado junto a su recibo
en SQLite. Banner/hoja tienen visibilidad independiente del trabajo; revisar un
elemento conserva los demás y el regreso a resultados. Alta y selección comparten
servicio; reintentar no repite altas/importaciones. Crítica v2 conserva proveedor/
ámbito/enlace y recibos; Reemplazar acepta explícitamente notas de plataforma
listada para coincidencias fiables. `useMetadataAutofillBatch` se mantiene para
refrescar un rol con validación en navegador, sin vaciar URLs ni sincronizar jugadores. Véanse
[Flujos de metadatos](METADATA_AUTOFILL.es.md).

## Descubrimiento y guía

El servidor elige sobre la colección propia o valida y sortea entre los IDs exactos
mostrados elegidos en el modal. `DisplayedGamesProvider` identifica página cargada
por cuenta, ruta y datos: cambiarla cancela la elección y una respuesta fuera del
ámbito se rechaza. La búsqueda global no reemplaza ese registro.
Un observador de la página usa la frontera
del servidor y la visibilidad para actualizar filas diarias; se elimina al salir
o cambiar de cuenta.

La guía viene de la API, no de una marca global del navegador. Los ejemplos se
añaden solo al aceptarlos. Borrar congela IDs/timestamps de juegos/listas hasta
confirmar: otro cambio obliga a revisar de nuevo.
El capítulo Vistas crea explícitamente tres vistas normales localizadas; limpiar
ejemplos no las posee ni borra. Campos de capacidad conservan la UX con API anterior.
Los atajos reservan dos plazas persistidas en servidor y completan huecos con uso
reciente. Las chinchetas se fusionan aparte de configuración/uso y se rechazan
lecturas anteriores a fijar. La rotación de Jugando es un temporizador UI visible
de20s, no sync ni worker; tiene guardas de visibilidad/diálogos/movimiento/interacción.

## Presentación y pruebas

SCSS adapta tokens semánticos a trece temas; layout y color son independientes.
Los diálogos nativos crean la capa modal. Teclado, retorno de foco, movimiento
reducido, touch targets y decodificación de imágenes tienen pruebas de navegador.

La densidad de Cards se persiste aparte de filtros. Labels nativos seleccionan toda
la tarjeta y vuelven inertes sus controles de ficha/edición durante la selección.
Los paneles portallados evitan recorte en rails y devuelven el orden lógico de Tab.
Los selects mejoran el picker progresivamente; otros motores conservan fallback
nativo legible. Crear conserva recibos por fila ante fallos parciales y el UUID/hash
opcional de API impide duplicar solicitudes manuales.

Vitest/Testing Library/MSW cubre contratos de interacción/estado. Cypress prueba
el build Vite con APIs interceptadas. jsdom ni mocks UI por sí solos demuestran
geometría real o autorización del backend.

Consulta [Primeros pasos](GETTING_STARTED.es.md), [Guía de uso](USER_GUIDE.es.md)
y [Arquitectura de la API](https://github.com/David-H-Afonso/GamesDatabase.Api).
