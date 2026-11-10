# Flow Tasks

Aplicación moderna de gestión de tareas con backend, autenticación y almacenamiento persistente.

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Ejecutar la app

```bash
npm start
```

Luego abre:

http://localhost:3000

## Usuario de prueba

- Usuario: `admin`
- Contraseña: `123456`

## Funcionalidades

- Inicio de sesión
- Listado de tareas con prioridad y fecha
- Agregar, editar, completar y eliminar tareas
- Filtros por todas, pendientes y completadas
- Persistencia en archivo JSON del servidor

## Estructura

- [server.js](server.js) — backend y API
- [public/index.html](public/index.html) — pantalla principal
- [public/style.css](public/style.css) — estilos modernos
- [public/app.js](public/app.js) — lógica del cliente
