<div align="center">

# ✂️ TurnoFácil — Frontend

**Tu próxima cita, organizada en pocos minutos.**

Aplicación web para explorar servicios, reservar horarios y administrar citas de barbería desde un solo lugar.

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white)

</div>

## ✨ Funcionalidades

- **Registro e inicio de sesión** con autenticación JWT.
- **Catálogo de servicios** conectado a la API.
- **Reservas en línea** con horarios disponibles en tiempo real.
- **Mis citas:** consulta y filtros de reservas activas y canceladas.
- **Cancelación de citas** desde la cuenta del cliente.
- Navegación responsive y rutas protegidas.

## 🛠️ Tecnologías

**Angular 22 · TypeScript · Bootstrap 5 · SCSS · RxJS**

## 🚀 Ejecución local

Necesitas Node.js y npm compatibles con Angular 22, y el [backend de TurnoFácil](https://github.com/BeLawliet/BIT-Bootcamp-Proyecto-TurnoFacil-Backend) ejecutándose localmente.

```bash
npm install
npm start
```

Abre **http://localhost:4200** en tu navegador.

La URL de la API se configura en `src/environments/environment.ts` y, por defecto, apunta a `http://localhost:3000/api/v1`. El backend debe permitir el origen `http://localhost:4200` mediante CORS.

Para generar la versión de producción:

```bash
npm run build
```

## 🔗 Backend

La autenticación, los servicios y las reservas se gestionan mediante una API REST con Node.js, Express y MongoDB Atlas.

**[Ver repositorio del backend](https://github.com/BeLawliet/BIT-Bootcamp-Proyecto-TurnoFacil-Backend)**

---

<div align="center">

**Proyecto académico · Bootcamp de Desarrollo Web Full Stack**

</div>
