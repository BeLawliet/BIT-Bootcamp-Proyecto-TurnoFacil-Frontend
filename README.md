# TurnoFácil Frontend

Aplicación SPA desarrollada con Angular, TypeScript, SCSS y Bootstrap 5 para gestionar reservas de una barbería.

## Requisitos

- Node.js 26 o una versión compatible con Angular 22.
- npm 11.

## Desarrollo local

Instala las dependencias y levanta el servidor de desarrollo:

```bash
npm install
npm start
```

Abre [http://localhost:4200](http://localhost:4200). La aplicación recarga los cambios mientras desarrollas.

## Compilación

```bash
npm run build
```

Los archivos de producción quedan en `dist/turno-facil`.

## Estructura

- `src/app/shared/components`: barra de navegación y pie reutilizables.
- `src/app/features`: inicio, servicios, acceso, registro y página no encontrada.
- `src/environments/environment.ts`: URL base preparada para la API local (`http://localhost:3000/api/v1`).

Las vistas de servicios, acceso y registro son solo estructuras visuales en esta etapa; todavía no consumen la API ni guardan datos.
