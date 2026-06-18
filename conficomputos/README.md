# ConfíComputos — Sistema Completo
## HTML · CSS · JavaScript · Programación Orientada a Objetos

---

## 🚀 Cómo abrir el proyecto

**No necesitas instalar nada.** Solo abre los archivos directamente:

```
Doble clic en → index.html    (Página web principal)
Doble clic en → app.html      (Login de la aplicación)
```

O usa Live Server en VS Code para mejor experiencia.

---

## 🔐 Credenciales de acceso

| Rol           | Email                        | Contraseña |
|---------------|------------------------------|------------|
| Administrador | admin@gmail.com      | admin123   |
| Usuario       | fernanda@conficomputos.com      | fernanda123   |
| Usuario       | julian@conficomputos.com        | julian123     |

**Código de administrador (registro):** `ADMIN202`

---

## 📁 Arquitectura del Proyecto

```
conficomputos/
│
├── index.html                  ← Página web principal (landing)
├── app.html                    ← Login de la aplicación
│
├── pages/
│   ├── register.html           ← Registro de usuarios (3 pasos)
│   ├── admin-dashboard.html    ← Panel administrador
│   └── user-dashboard.html     ← Panel usuario
│
├── css/
│   ├── variables.css           ← Variables CSS, reset, utilitarios globales
│   ├── landing.css             ← Estilos página web (navbar, hero, footer...)
│   └── app.css                 ← Estilos aplicación (login, dashboard, carrito...)
│
├── js/
│   ├── models.js               ← Clases OOP (Usuario, Producto, Pedido...)
│   ├── database.js             ← Capa de datos + LocalStorage + ganchos API
│   ├── auth.js                 ← AuthService + StoreService + UI utils
│   ├── landing.js              ← Interacciones página web
│   ├── app.js                  ← LoginController + RegisterController
│   ├── admin.js                ← AdminApp (panel administrador completo)
│   └── user.js                 ← UserApp (panel usuario completo)
│
└── assets/
    └── img/                    ← Aquí va el logo: logo.png
```

---

## 🖼️ Cómo agregar el logo

1. Guarda tu logo como `assets/img/logo.png`
2. En cada archivo HTML busca los comentarios `<!-- LOGO: -->` y reemplaza la línea indicada:

```html
<!-- Antes (placeholder): -->
<span>C</span>

<!-- Después (con logo): -->
<img src="assets/img/logo.png" alt="ConfíComputos">
```

Los comentarios están en:
- `index.html` (navbar, sección nosotros, contacto, footer)
- `app.html` (login)
- `pages/register.html`
- `pages/admin-dashboard.html`
- `pages/user-dashboard.html`

---

## 🗄️ CONEXIÓN CON BASE DE DATOS REAL

### Arquitectura recomendada

```
Frontend (HTML/JS)  ←→  API REST (Node.js / PHP / Python)  ←→  Base de datos (MySQL / MongoDB)
```

### Paso 1 — Crear tu API REST

**Opción A: Node.js + Express + MySQL**
```bash
npm init -y
npm install express mysql2 cors bcrypt jsonwebtoken
```

**Opción B: PHP + MySQL** (más sencillo)
```
api/
├── usuarios.php
├── productos.php
├── pedidos.php
└── ganancias.php
```

---

### Paso 2 — Estructura de tablas MySQL

```sql
-- Usuarios
CREATE TABLE usuarios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  email       VARCHAR(100) UNIQUE NOT NULL,
  pass        VARCHAR(255) NOT NULL,  -- usar bcrypt
  rol         ENUM('admin','usuario') DEFAULT 'usuario',
  activo      BOOLEAN DEFAULT TRUE,
  telefono    VARCHAR(20),
  ciudad      VARCHAR(80),
  depto       VARCHAR(80),
  fecha_nac   DATE,
  registrado  DATE DEFAULT (CURDATE())
);

-- Productos
CREATE TABLE productos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  precio      DECIMAL(12,2) NOT NULL,
  stock       INT DEFAULT 0,
  categoria   VARCHAR(80),
  emoji       VARCHAR(10),
  vendidos    INT DEFAULT 0
);

-- Pedidos
CREATE TABLE pedidos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT, FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  metodo_pago     ENUM('tarjeta','nequi','efectivo'),
  tiempo_recogida INT DEFAULT 20,
  estado          ENUM('pendiente','listo','entregado') DEFAULT 'pendiente',
  total           DECIMAL(12,2),
  fecha           DATETIME DEFAULT NOW()
);

-- Items de pedido
CREATE TABLE pedido_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id   INT, FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  producto_id INT,
  nombre      VARCHAR(150),
  emoji       VARCHAR(10),
  precio      DECIMAL(12,2),
  cantidad    INT
);

-- Ganancias
CREATE TABLE ganancias (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id   INT,
  total       DECIMAL(12,2),
  mes         VARCHAR(7),   -- "2025-05"
  semana      VARCHAR(10),  -- "2025-S21"
  fecha       DATETIME DEFAULT NOW()
);
```

---

### Paso 3 — Activar modo API en database.js

Abre `js/database.js` y cambia la línea:

```javascript
// Línea 12 — Cambiar esto:
const DB_MODE = 'local';

// A esto:
const DB_MODE = 'api';

// Y define tu URL:
const API_BASE_URL = 'http://tuservidor.com/api';
// o local:
const API_BASE_URL = 'http://localhost:3000/api';
```

---

### Paso 4 — Descomentar las llamadas fetch()

En `database.js`, cada método tiene su equivalente API comentado. Por ejemplo:

```javascript
// ANTES (LocalStorage):
getProductos() {
  return this._cargar(this._keys.productos).map(Producto.fromJSON);
}

// DESPUÉS (API REST):
async getProductos() {
  const r = await fetch(`${API_BASE_URL}/productos`);
  return (await r.json()).map(Producto.fromJSON);
}
```

> ⚠️ Al activar la API, los métodos se vuelven `async`.
> Actualiza los llamadores con `await`: `const prods = await db.getProductos();`

---

### Paso 5 — Ejemplo de endpoint Node.js

```javascript
// api/productos.js (Node.js + Express)
const express = require('express');
const router  = express.Router();
const db      = require('../db');  // tu conexión MySQL

// GET todos los productos
router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM productos');
  res.json(rows);
});

// POST crear producto
router.post('/', async (req, res) => {
  const { nombre, precio, stock, categoria, emoji } = req.body;
  const [result] = await db.query(
    'INSERT INTO productos (nombre,precio,stock,categoria,emoji) VALUES (?,?,?,?,?)',
    [nombre, precio, stock, categoria, emoji]
  );
  res.json({ id: result.insertId, ...req.body });
});

// PUT actualizar producto
router.put('/:id', async (req, res) => {
  const { nombre, precio, stock, categoria, emoji } = req.body;
  await db.query(
    'UPDATE productos SET nombre=?,precio=?,stock=?,categoria=?,emoji=? WHERE id=?',
    [nombre, precio, stock, categoria, emoji, req.params.id]
  );
  res.json({ ok: true });
});

// DELETE eliminar producto
router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM productos WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
```

---

### Para SMS real (Twilio)

Reemplaza la simulación en `auth.js` → `UI.toast(..., 'sms')` con una llamada a tu API:

```javascript
// En tu servidor Node.js
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

router.post('/sms', async (req, res) => {
  await client.messages.create({
    body: req.body.mensaje,
    from: '+1XXXXXXXXXX',   // tu número Twilio
    to:   req.body.telefono
  });
  res.json({ ok: true });
});
```

---

## 🏗️ Principios OOP aplicados

| Principio | Dónde |
|---|---|
| **Encapsulamiento** | `AuthService` con IIFE, métodos privados en `Database` |
| **Abstracción** | `db.getProductos()` oculta si usa LocalStorage o API |
| **Clases** | `Usuario`, `Producto`, `Pedido`, `ItemCarrito`, `RegistroGanancia`, `Notificacion` |
| **Getters** | `estadoStock`, `badgeClase`, `total`, `idFmt`, `precioFmt` siempre actualizados |
| **Factory / fromJSON** | `Usuario.fromJSON()`, `Producto.fromJSON()` para reconstruir objetos desde BD |
| **Singleton** | `const db = new Database()` — una sola instancia global |
| **Módulo IIFE** | `AuthService`, `StoreService`, `UI`, `AdminApp`, `UserApp` — sin variables globales sueltas |

---

## 📱 Responsive

- ✅ Desktop (1200px+)
- ✅ Tablet (768px–1024px) — sidebar colapsable
- ✅ Móvil (480px–768px) — menú hamburger, grids adaptados
- ✅ Móvil pequeño (< 480px) — todo en columna única
