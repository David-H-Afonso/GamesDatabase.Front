# Contribuir

[English](CONTRIBUTING.md) · [Instalación](docs/GETTING_STARTED.es.md)

Mantén cambios concretos y conserva los flujos existentes. En cambios visuales,
incluye capturas reales en tamaños relevantes de móvil/tablet/escritorio.

## Antes del pull request

```sh
npm ci --include=optional
npm run build
npm run lint
npm run test
npm run test:i18n
npm run test:versioning
node scripts/ci/native-lock.mjs --installed
npm run security:all
```

Ejecuta los recorridos Cypress del build para los flujos cambiados. Usa fixtures
y cuentas aisladas, no datos personales. Conserva los primeros fallos; no saltes
tests, silencies excepciones ni cambies baselines para ocultar errores.

## Convenciones

- TypeScript, servicios existentes y tokens SCSS semánticos.
- Claves EN/ES para todo texto visible.
- Teclado, foco visible, targets táctiles y movimiento reducido.
- DTO/modelo/servicio actualizados con el contrato API correspondiente.
- Mutaciones parciales, borradores conservados, aislamiento y conflictos explícitos.
- Sin librerías UI, sincronización recurrente o nuevos servicios sin acordarlo.

Commits: `type(scope): resumen concreto`. El kit prepara la versión desde el padre;
consulta [sus comprobaciones](scripts/versioning/README.md). Los hitos elegidos
por el propietario pueden usar `Release-As`. No cambies tags publicados ni
publiques/despliegues como parte de una contribución rutinaria.

## Reportes y revisión

Explica problema, enfoque, contratos, comandos/resultados e impacto de migración/
recuperación. Para bugs, indica pasos y versiones. Tests fuente y docs útiles van
a Git; builds, informes privados, sesiones, bases, exports y env no.

No publiques credenciales, tokens, claves, logs privados o dumps. Sigue el
procedimiento de contacto privado de [Seguridad](SECURITY.md) antes de divulgar un problema sensible. Las
contribuciones quedan sujetas a la GPL del repositorio.
