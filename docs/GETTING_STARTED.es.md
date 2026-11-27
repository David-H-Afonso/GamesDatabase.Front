# Primeros pasos con Games Database

[English](GETTING_STARTED.md) · [Guía de uso](USER_GUIDE.es.md)

Instalación local del par web/API, no despliegue de producción. Requiere SDK
.NET 10, Node 22.13+ y npm 10+.

## 1. Obtén ambos repositorios

```sh
git clone https://github.com/David-H-Afonso/GamesDatabase.Api.git
git clone https://github.com/David-H-Afonso/GamesDatabase.Front.git
```

## 2. Configura la API

Desde `GamesDatabase.Api`, elige una SQLite y un directorio de exportación
explícitos. Usa una carpeta vacía para una instalación nueva. No experimentes
sobre tu base personal: el arranque aplica sus migraciones pendientes.

Configura estas variables en el terminal o en un almacén privado:

| Variable | Uso local |
| --- | --- |
| `GAMESDATABASE_DB_PATH` | Ruta SQLite elegida |
| `ExportSettings__DefaultExportPath` | Directorio privado de exports |
| `JWT_SECRET_KEY` | Clave privada y robusta, mínimo 32 caracteres |
| `JWT_ISSUER` / `JWT_AUDIENCE` | Identidades de token deliberadas |
| `ASPNETCORE_URLS` | HTTP loopback 5011 para este ejemplo |
| `CorsSettings__AllowedOrigins__0` | Origen del navegador que usarás |
| `HOUSEHOLD_REDIRECT_URIS` | Lista obligatoria de callbacks exactos, separados por comas, sin comodines |
| `HOUSEHOLD_CLIENT_ID` | Identificador del cliente Household si cambias el valor incorporado |

Los secretos del servidor no van al Front. Genera la clave con tu gestor de
contraseñas o entorno seguro; no copies una clave de ejemplo versionada. No subas
`.env*`, Development, bases ni exports.

El arranque valida los callbacks Household también en una biblioteca independiente.
Si no lo conectas, reserva un callback no enrutable como
`https://household-client.invalid/callback`; no permitas redirecciones arbitrarias
para evitar la validación. En una conexión real, usa la URI exacta del cliente y
consulta la guía de integración Household de la API.

```sh
cd GamesDatabase.Api
dotnet restore GamesDatabase.Api.sln
dotnet build GamesDatabase.Api.sln --configuration Release
dotnet test tests/GamesDatabase.Api.Tests/GamesDatabase.Api.Tests.csproj --configuration Release
dotnet run --project GamesDatabase.Api.csproj --no-launch-profile --urls http://127.0.0.1:5011
```

En una base vacía, el arranque crea el esquema actual y registra su baseline.
Usa el arranque para inicializarla, no las migraciones históricas directas con
`dotnet ef database update` sobre un archivo recién creado. Las bases existentes
usan sus migraciones pendientes reales y requieren copia previa. Revisa `/health`.

## 3. Ejecuta el Front

En otro terminal, desde `GamesDatabase.Front`:

```sh
npm ci --include=optional
```

Un `.env` local de desarrollo puede contener esta URL pública:

```env
VITE_API_URL=http://127.0.0.1:5011/api
```

```sh
npm run dev
```

Abre `http://localhost:5173`, o usa127.0.0.1 de forma consistente si configuraste
ese origen. Evita mezclar orígenes al comprobar CORS o login.

## 4. Prepara tu biblioteca

1. Una instalación nueva ofrece el administrador inicial. Entra localmente y
   establece su contraseña antes de compartir el servicio.
2. La guía permite usar tu biblioteca o aceptar seis juegos ficticios identificados
   y una playlist manual. También ofrece tres vistas normales útiles, retenidas tras
   guía/limpieza, que puedes añadir sin juegos de ejemplo. Leer nunca las crea.
3. Añade un título y un estado. Abre su ficha para completar el resto.
4. Utiliza playlists, Focus e Inicio según la [Guía de uso](USER_GUIDE.es.md).
5. Al terminar, conserva, borra o decide más tarde sobre los ejemplos.

Los ejemplos editados se conservan por defecto. Borrar revisa IDs/timestamps;
las listas mixtas y los demás juegos permanecen. Otro cambio obliga a recargar
y revisar de nuevo.

## 5. Añade otro usuario

Desde el perfil de administrador, abre **Usuarios**. Elige rol, contraseña y si
mostrar la guía. Crear una cuenta no entra con ella ni añade ejemplos. Los
usuarios existentes pueden reiniciar la guía desde su perfil; el administrador
puede activarla en Editar usuario.

## 6. Comprueba el build

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 5174 --strictPort
```

Preview no tiene el proxy de imágenes de Vite dev. Configura URL/runtime y proxy
adecuados para datos reales. Cypress usa APIs interceptadas y fixtures locales:

```sh
npm run cypress:run -- --browser electron --config baseUrl=http://127.0.0.1:5174
```

## Datos existentes y producción

Lee [Despliegue y recuperación](DEPLOYMENT.es.md). Acuerda rutas reales, copia
consistente con WAL, restauración aislada e imagen anterior por digest. Un push
puede publicar, pero no autoriza despliegue ni restauración.

Ante fallos, revisa por separado API, origen, puertos e imágenes. Nunca conectes
una prueba aislada a producción para resolverla.
