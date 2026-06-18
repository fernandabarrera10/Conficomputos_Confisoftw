/**
 * CONFICOMPUTOS — Panel Administrador
 * admin.js
 */
'use strict';

const AdminApp = (() => {
  let currentUser = null;
  let currentSection = 'productos';

  /* ── INIT ── */
  function init() {
    currentUser = AuthService.requerirAdmin();
    if (!currentUser) return;
    document.getElementById('tb-user-name').textContent = currentUser.nombre;
    document.getElementById('tb-avatar').textContent    = currentUser.iniciales;
    UI.updateNotifBadge();
    setupNav();
    renderSection('productos');
  }

  /* ── NAV ── */
  function setupNav() {
    document.querySelectorAll('.nav-item[data-section]').forEach(el => {
      el.addEventListener('click', () => renderSection(el.dataset.section));
    });
    document.getElementById('btn-logout')?.addEventListener('click', AuthService.logout);
    document.getElementById('btn-menu-toggle')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }

  function renderSection(section) {
    currentSection = section;
    document.querySelectorAll('.nav-item[data-section]').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });
    const content = document.getElementById('main-content');
    content.innerHTML = '';
    const map = {
      'productos':          renderProductos,
      'inventario':         renderInventario,
      'historial-inv':      renderHistorialInventario,
      'pedidos-admin':      renderPedidosAdmin,
      'pedidos-live':       renderPedidosLive,
      'usuarios':           renderUsuarios,
      'perfil':             renderPerfil,
    };
    if (map[section]) map[section](content);
    document.getElementById('sidebar').classList.remove('open');
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: PRODUCTOS
     ══════════════════════════════════════════════════════════ */
  function renderProductos(c) {
    c.innerHTML = `
      <h2 class="page-title">Gestión de Productos</h2>
      <p class="page-sub">Administra el catálogo completo de la tienda.</p>
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
        <button class="btn btn-rosa" id="btn-nuevo-prod">+ Agregar Producto</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th></th><th>Nombre</th><th>Precio</th><th>Stock</th><th>Categoría</th><th>Vendidos</th><th>Acciones</th></tr></thead>
          <tbody id="tbody-prod"></tbody>
        </table>
      </div>
      <!-- Modal producto -->
      <div class="modal-overlay" id="modal-prod">
        <div class="modal-box">
          <h3 class="modal-title" id="modal-prod-title">Nuevo Producto</h3>
          <div class="form-row">
            <div class="form-group"><label>Emoji</label><input id="p-emoji" maxlength="2" value="📦"></div>
            <div class="form-group"><label>Categoría</label><input id="p-cat" placeholder="Papelería, Tecnología..."></div>
          </div>
          <div class="form-group"><label>Nombre</label><input id="p-nombre" placeholder="Nombre del producto"></div>
          <div class="form-row">
            <div class="form-group"><label>Precio (COP)</label><input id="p-precio" type="number" min="0"></div>
            <div class="form-group"><label>Stock</label><input id="p-stock" type="number" min="0"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="UI.closeModal('modal-prod')">Cancelar</button>
            <button class="btn btn-rosa" id="btn-guardar-prod">Guardar</button>
          </div>
        </div>
      </div>`;
    refreshTablaProductos();
    document.getElementById('btn-nuevo-prod').onclick = () => abrirModalProducto(null);
  }

  function refreshTablaProductos() {
    const tbody = document.getElementById('tbody-prod');
    if (!tbody) return;
    tbody.innerHTML = db.getProductos().map(p => `
      <tr>
        <td style="font-size:22px">${p.emoji}</td>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.precioFmt}</td>
        <td><span class="badge ${p.badgeClase}">${p.badgeLabel}</span></td>
        <td>${p.categoria}</td>
        <td>${p.vendidos}</td>
        <td><div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" onclick="AdminApp.editarProducto(${p.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="AdminApp.eliminarProducto(${p.id})">🗑️</button>
        </div></td>
      </tr>`).join('');
  }

  function abrirModalProducto(id) {
    const p = id ? db.getProductos().find(x => x.id === id) : null;
    document.getElementById('modal-prod-title').textContent = id ? 'Editar Producto' : 'Nuevo Producto';
    document.getElementById('p-emoji').value  = p ? p.emoji : '📦';
    document.getElementById('p-nombre').value = p ? p.nombre : '';
    document.getElementById('p-precio').value = p ? p.precio : '';
    document.getElementById('p-stock').value  = p ? p.stock : '';
    document.getElementById('p-cat').value    = p ? p.categoria : '';
    document.getElementById('btn-guardar-prod').onclick = () => guardarProducto(id);
    UI.openModal('modal-prod');
  }

  function guardarProducto(id) {
    const nombre = document.getElementById('p-nombre').value.trim();
    if (!nombre) { UI.toast('⚠️ Ingresa un nombre'); return; }
    const prod = new Producto(
      id || 0,
      nombre,
      parseFloat(document.getElementById('p-precio').value) || 0,
      parseInt(document.getElementById('p-stock').value) || 0,
      document.getElementById('p-cat').value.trim(),
      document.getElementById('p-emoji').value || '📦'
    );
    if (id) { prod.id = id; db.actualizarProducto(prod); UI.toast('✅ Producto actualizado'); }
    else    { db.crearProducto(prod); UI.toast('✅ Producto agregado'); }
    UI.closeModal('modal-prod');
    refreshTablaProductos();
  }

  function editarProducto(id)   { abrirModalProducto(id); }
  function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    db.eliminarProducto(id);
    refreshTablaProductos();
    UI.toast('🗑️ Producto eliminado');
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: INVENTARIO
     ══════════════════════════════════════════════════════════ */
  function renderInventario(c) {
    const prods    = db.getProductos();
    const gans     = db.getGanancias();
    const semanas  = db.gananciasPorSemana();
    const meses    = db.gananciasPorMes();
    const semTotal = semanas.length ? semanas[0].total : 0;
    const mesTotal = meses.length  ? meses[0].total   : 0;
    const agotados = prods.filter(p => p.stock === 0);
    const stockBajo= prods.filter(p => p.stock > 0 && p.stock <= 3);
    const masVend  = [...prods].sort((a,b) => b.vendidos - a.vendidos).slice(0,5);
    const maxVend  = masVend.length ? masVend[0].vendidos : 1;

    c.innerHTML = `
      <h2 class="page-title">Inventario & Finanzas</h2>
      <p class="page-sub">Resumen ejecutivo de rendimiento y stock.</p>
      <div class="stat-grid">
        <div class="stat-card"><div class="s-label">Ganancias Semana</div><div class="s-value">${UI.fmt(semTotal)}</div><div class="s-sub">Última semana</div></div>
        <div class="stat-card"><div class="s-label">Ganancias Mes</div><div class="s-value">${UI.fmt(mesTotal)}</div><div class="s-sub">Mes actual</div></div>
        <div class="stat-card"><div class="s-label">Agotados</div><div class="s-value" style="color:#dc2626">${agotados.length}</div><div class="s-sub">Stock = 0</div></div>
        <div class="stat-card"><div class="s-label">Stock Bajo</div><div class="s-value" style="color:#ea580c">${stockBajo.length}</div><div class="s-sub">≤ 3 unidades</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;flex-wrap:wrap">
        <div class="card">
          <div class="card-title">🏆 Más Vendidos</div>
          ${masVend.map(p => `<div class="bar-row"><div class="bar-label">${p.emoji} ${p.nombre}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(p.vendidos/maxVend*100)}%"></div></div><div class="bar-val">${p.vendidos}</div></div>`).join('')}
        </div>
        <div class="card">
          <div class="card-title">📦 Estado Stock</div>
          <div style="font-size:11px;font-weight:700;color:var(--gris-400);text-transform:uppercase;margin-bottom:8px">Agotados</div>
          ${agotados.length ? agotados.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--gris-200)">${p.emoji} <span style="flex:1;font-size:13px">${p.nombre}</span><span class="badge badge-critical">Agotado</span></div>`).join('') : '<p style="font-size:13px;color:var(--gris-400)">✅ Sin agotados</p>'}
          <div style="font-size:11px;font-weight:700;color:var(--gris-400);text-transform:uppercase;margin:14px 0 8px">Stock Bajo (≤3)</div>
          ${stockBajo.length ? stockBajo.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--gris-200)">${p.emoji} <span style="flex:1;font-size:13px">${p.nombre}</span><span class="badge badge-low">${p.stock} uds</span></div>`).join('') : '<p style="font-size:13px;color:var(--gris-400)">✅ Stock saludable</p>'}
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: HISTORIAL INVENTARIO
     ══════════════════════════════════════════════════════════ */
  function renderHistorialInventario(c) {
    const meses   = db.gananciasPorMes();
    const semanas = db.gananciasPorSemana();
    const gans    = db.getGanancias();
    const total   = gans.reduce((a,g) => a+g.total, 0);
    const maxMes  = meses.length  ? Math.max(...meses.map(m=>m.total))  : 1;
    const maxSem  = semanas.length? Math.max(...semanas.map(s=>s.total)): 1;
    const mesNames= {'01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'};

    c.innerHTML = `
      <h2 class="page-title">Historial de Inventario</h2>
      <p class="page-sub">Registro histórico de ganancias por mes y semana.</p>
      <div class="stat-grid">
        <div class="stat-card"><div class="s-label">Total Acumulado</div><div class="s-value" style="font-size:18px">${UI.fmt(total)}</div></div>
        <div class="stat-card"><div class="s-label">Transacciones</div><div class="s-value">${gans.length}</div></div>
        <div class="stat-card"><div class="s-label">Meses</div><div class="s-value">${meses.length}</div></div>
        <div class="stat-card"><div class="s-label">Promedio Mensual</div><div class="s-value" style="font-size:18px">${meses.length ? UI.fmt(Math.round(total/meses.length)) : '—'}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <div class="card-title">📅 Ganancias por Mes</div>
          ${meses.map(m => { const [y,mo]=m.mes.split('-'); return `<div class="bar-row"><div class="bar-label">${mesNames[mo]||mo} ${y}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(m.total/maxMes*100)}%"></div></div><div class="bar-val">${UI.fmt(m.total)}</div></div>`; }).join('')}
        </div>
        <div class="card">
          <div class="card-title">📆 Ganancias por Semana</div>
          ${semanas.map(s => `<div class="bar-row"><div class="bar-label" style="width:80px">${s.semana}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(s.total/maxSem*100)}%"></div></div><div class="bar-val">${UI.fmt(s.total)}</div></div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">🧾 Detalle de Transacciones</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Fecha</th><th>Semana</th><th>Mes</th><th>Monto</th></tr></thead>
            <tbody>${gans.map((g,i) => `<tr><td>${gans.length-i}</td><td>${g.fecha}</td><td>${g.semana}</td><td>${g.mes}</td><td><strong style="color:var(--rosa-700)">${UI.fmt(g.total)}</strong></td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: PEDIDOS ADMIN (historial todos)
     ══════════════════════════════════════════════════════════ */
  function renderPedidosAdmin(c) {
    const pedidos  = db.getPedidos();
    const totalRec = pedidos.reduce((a,p) => a+p.total, 0);
    c.innerHTML = `
      <h2 class="page-title">Pedidos de Clientes</h2>
      <p class="page-sub">Historial completo de todas las compras.</p>
      <div class="stat-grid">
        <div class="stat-card"><div class="s-label">Total Pedidos</div><div class="s-value">${pedidos.length}</div></div>
        <div class="stat-card"><div class="s-label">Total Recaudado</div><div class="s-value" style="font-size:18px">${UI.fmt(totalRec)}</div></div>
        <div class="stat-card"><div class="s-label">Promedio Pedido</div><div class="s-value" style="font-size:18px">${pedidos.length ? UI.fmt(Math.round(totalRec/pedidos.length)) : '—'}</div></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Productos</th><th>Método</th><th>Tiempo</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
          <tbody>
            ${pedidos.map(p => `
              <tr>
                <td><strong style="color:var(--rosa-700)">#${String(p.id).padStart(4,'0')}</strong></td>
                <td><div style="display:flex;align-items:center;gap:8px">${UI.avatar(p.usuarioNombre?.[0]||'?',28)}<span>${p.usuarioNombre||'—'}</span></div></td>
                <td style="font-size:12px;max-width:220px">${(p.items||[]).slice(0,2).map(i=>`${i.emoji} ${i.nombre} ×${i.cantidad}`).join(', ')}${(p.items||[]).length>2?` +${p.items.length-2} más`:''}</td>
                <td><span class="badge badge-purple" style="font-size:10px">${p.metodoPago||'—'}</span></td>
                <td>${p.tiempoRecogida} min</td>
                <td style="font-size:12px;color:var(--gris-400)">${p.fecha}</td>
                <td><strong style="color:var(--rosa-700)">${UI.fmt(p.total)}</strong></td>
                <td><span class="badge ${p.estado==='entregado'?'badge-active':p.estado==='listo'?'badge-blue':'badge-low'}">${p.estado||'pendiente'}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: PEDIDOS EN TIEMPO REAL
     ══════════════════════════════════════════════════════════ */
  function renderPedidosLive(c) {
    const notifs  = db.getNotificaciones();
    const pedidos = db.getPedidos().filter(p => p.estado !== 'entregado');
    UI.updateNotifBadge();

    c.innerHTML = `
      <h2 class="page-title">Pedidos en Tiempo Real</h2>
      <p class="page-sub">Alertas y estado actualizado de pedidos activos.</p>
      <div class="card" style="margin-bottom:24px">
        <div class="card-title" style="justify-content:space-between">
          <span>🔔 Notificaciones (${notifs.length})</span>
          <button class="btn btn-sm btn-outline" id="btn-marcar-leidas">Marcar todas leídas</button>
        </div>
        <div id="notifs-list">
          ${notifs.length === 0
            ? '<div class="empty-state" style="padding:20px"><div class="es-icon">🔔</div><p>Sin notificaciones aún.</p></div>'
            : notifs.map(n => `
              <div class="notif-row ${n.leida?'':'unread'}" onclick="AdminApp.marcarLeida(${n.id})">
                <div class="notif-dot ${n.leida?'':'unread'}"></div>
                <div class="notif-content">
                  <div class="notif-title-row"><span>${n.titulo}</span><span class="notif-time">${n.fecha}</span></div>
                  <p class="notif-msg">${n.mensaje}</p>
                </div>
              </div>`).join('')}
        </div>
      </div>
      <h3 style="font-size:18px;color:var(--rosa-800);margin-bottom:14px">📦 Pedidos Pendientes / Activos</h3>
      ${pedidos.length === 0
        ? '<div class="card"><div class="empty-state"><div class="es-icon">📦</div><p>No hay pedidos activos en este momento.</p></div></div>'
        : pedidos.map(p => `
          <div class="pedido-live-card" id="plc-${p.id}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
              <div><div style="font-size:18px;font-weight:700;color:var(--rosa-700);font-family:var(--font-display)">#${String(p.id).padStart(4,'0')}</div><div style="font-size:12px;color:var(--gris-400)">${p.fecha}</div></div>
              <span class="badge ${p.estado==='listo'?'badge-blue':'badge-low'}">${p.estado}</span>
            </div>
            <div class="pedido-usuario">
              ${UI.avatar(p.usuarioNombre?.[0]||'?', 32)}
              <div><div style="font-weight:600;font-size:14px">${p.usuarioNombre||'—'}</div></div>
            </div>
            <div class="pedido-items-list">
              ${(p.items||[]).map(i=>`<div class="pi-row"><span>${i.emoji} ${i.nombre} ×${i.cantidad}</span><span>${UI.fmt(i.precio*i.cantidad)}</span></div>`).join('')}
            </div>
            <div class="pedido-footer">
              <div>
                <div style="font-size:12px;color:var(--gris-400)">${{tarjeta:'Tarjeta de crédito',nequi:'Nequi',efectivo:'Efectivo'}[p.metodoPago]||p.metodoPago}</div>
                <div class="tiempo-badge">⏱️ Recoger en ${p.tiempoRecogida} minutos</div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:700;color:var(--rosa-700);font-size:18px">${UI.fmt(p.total)}</div>
                <div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end">
                  ${p.estado==='pendiente' ? `<button class="btn btn-sm btn-outline" onclick="AdminApp.cambiarEstado(${p.id},'listo')">✅ Listo</button>` : ''}
                  ${p.estado==='listo'     ? `<button class="btn btn-sm btn-green"   onclick="AdminApp.cambiarEstado(${p.id},'entregado')">📦 Entregado</button>` : ''}
                </div>
              </div>
            </div>
          </div>`).join('')}`;

    document.getElementById('btn-marcar-leidas')?.addEventListener('click', () => {
      db.marcarTodasLeidas();
      UI.updateNotifBadge();
      renderPedidosLive(c);
    });
  }

  function marcarLeida(id) {
    const lista = db.getNotificaciones();
    const n = lista.find(x => x.id === id);
    if (n) { n.leida = true; db.marcarTodasLeidas(); }
  }

  function cambiarEstado(pedidoId, estado) {
    db.actualizarEstadoPedido(pedidoId, estado);
    UI.toast(estado === 'listo' ? '✅ Pedido marcado como listo' : '📦 Pedido entregado');
    renderSection('pedidos-live');
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: USUARIOS
     ══════════════════════════════════════════════════════════ */
  function renderUsuarios(c) {
    c.innerHTML = `
      <h2 class="page-title">Historial de Usuarios</h2>
      <p class="page-sub">Gestión y estado de todos los usuarios registrados.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Ciudad</th><th>Tel.</th><th>Registrado</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody id="tbody-users"></tbody>
        </table>
      </div>
      <!-- Modal Editar Usuario -->
      <div class="modal-overlay" id="modal-edit-user">
        <div class="modal-box" style="max-width:480px">
          <h3 class="modal-title">✏️ Editar Usuario</h3>
          <div class="form-group"><label>Nombre completo</label><input id="eu-nombre" class="w-full"></div>
          <div class="form-group"><label>Correo electrónico</label><input id="eu-email" type="email"></div>
          <div class="form-group"><label>Teléfono</label><input id="eu-tel"></div>
          <div class="form-row">
            <div class="form-group"><label>Ciudad</label><input id="eu-ciudad"></div>
            <div class="form-group"><label>Departamento</label><input id="eu-depto"></div>
          </div>
          <div class="form-group">
            <label>Rol</label>
            <select id="eu-rol">
              <option value="usuario">👤 Usuario / Cliente</option>
              <option value="admin">🛡️ Administrador</option>
            </select>
          </div>
          <div class="form-group"><label>Nueva contraseña (dejar vacío para no cambiar)</label><input id="eu-pass" type="password" placeholder="••••••••"></div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="document.getElementById('modal-edit-user').classList.remove('open')">Cancelar</button>
            <button class="btn btn-rosa" id="btn-save-user">💾 Guardar cambios</button>
          </div>
        </div>
      </div>`;
    refreshTablaUsuarios();
  }

  function refreshTablaUsuarios() {
    const tbody = document.getElementById('tbody-users');
    if (!tbody) return;
    tbody.innerHTML = db.getUsuarios().map(u => `
      <tr>
        <td><div style="display:flex;align-items:center;gap:8px">${UI.avatar(u.iniciales, 30)}<strong>${u.nombre}</strong></div></td>
        <td style="font-size:13px">${u.email}</td>
        <td><span class="badge badge-purple">${u.rolLabel}</span></td>
        <td>${u.ciudad||'—'}</td>
        <td style="font-size:13px">${u.telefono||'—'}</td>
        <td>${u.registrado}</td>
        <td><span class="badge ${u.activo?'badge-active':'badge-inactive'}">${u.activo?'Activo':'Inactivo'}</span></td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm" style="background:var(--rosa-100);color:var(--rosa-700);border:1.5px solid var(--rosa-300)" onclick="AdminApp.editarUsuario(${u.id})">✏️ Editar</button>
            <button class="btn btn-sm btn-outline" onclick="AdminApp.toggleUsuario(${u.id})">${u.activo?'Desactivar':'Activar'}</button>
          </div>
        </td>
      </tr>`).join('');
  }

  function toggleUsuario(id) {
    const users = db.getUsuarios();
    const u = users.find(x => x.id === id);
    if (!u) return;
    u.toggleActivo();
    db.actualizarUsuario(u);
    UI.toast(u.activo ? '✅ Usuario activado' : '❌ Usuario desactivado');
    refreshTablaUsuarios();
  }

  function editarUsuario(id) {
    const u = db.getUsuarios().find(x => x.id === id);
    if (!u) return;
    document.getElementById('eu-nombre').value = u.nombre || '';
    document.getElementById('eu-email').value  = u.email  || '';
    document.getElementById('eu-tel').value    = u.telefono || '';
    document.getElementById('eu-ciudad').value = u.ciudad  || '';
    document.getElementById('eu-depto').value  = u.depto   || '';
    document.getElementById('eu-rol').value    = u.rol     || 'usuario';
    document.getElementById('eu-pass').value   = '';
    document.getElementById('btn-save-user').onclick = () => guardarEdicionUsuario(id);
    document.getElementById('modal-edit-user').classList.add('open');
  }

  function guardarEdicionUsuario(id) {
    const u = db.getUsuarios().find(x => x.id === id);
    if (!u) return;
    u.nombre   = document.getElementById('eu-nombre').value.trim() || u.nombre;
    u.email    = document.getElementById('eu-email').value.trim()  || u.email;
    u.telefono = document.getElementById('eu-tel').value.trim();
    u.ciudad   = document.getElementById('eu-ciudad').value.trim();
    u.depto    = document.getElementById('eu-depto').value.trim();
    u.rol      = document.getElementById('eu-rol').value;
    const np   = document.getElementById('eu-pass').value;
    if (np.length >= 6) u.pass = np;
    db.actualizarUsuario(u);
    document.getElementById('modal-edit-user').classList.remove('open');
    UI.toast('✅ Usuario actualizado correctamente');
    refreshTablaUsuarios();
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: PERFIL
     ══════════════════════════════════════════════════════════ */
  function renderPerfil(c) {
    const u = currentUser;
    c.innerHTML = `
      <h2 class="page-title">Mi Perfil</h2>
      <p class="page-sub">Administra tu información personal.</p>
      <div class="card" style="max-width:480px;margin:0 auto">
        <div class="profile-avatar">${u.iniciales}</div>
        <div class="profile-name">${u.nombre}</div>
        <div style="text-align:center;margin-bottom:24px"><span class="badge badge-purple">${u.rolLabel}</span></div>
        <div class="form-group"><label>Nombre completo</label><input id="pf-nombre" value="${u.nombre}"></div>
        <div class="form-group"><label>Correo electrónico</label><input id="pf-email" type="email" value="${u.email}"></div>
        <div class="form-group"><label>Teléfono</label><input id="pf-tel" value="${u.telefono||''}"></div>
        <div class="form-group"><label>Ciudad</label><input id="pf-ciudad" value="${u.ciudad||''}"></div>
        <div class="form-group"><label>Nueva contraseña</label><input id="pf-pass" type="password" placeholder="Dejar vacío para no cambiar"></div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px">
          <button class="btn btn-rosa" id="btn-guardar-perfil">💾 Guardar cambios</button>
        </div>
      </div>`;
    document.getElementById('btn-guardar-perfil').onclick = () => {
      currentUser.nombre   = document.getElementById('pf-nombre').value || currentUser.nombre;
      currentUser.email    = document.getElementById('pf-email').value  || currentUser.email;
      currentUser.telefono = document.getElementById('pf-tel').value;
      currentUser.ciudad   = document.getElementById('pf-ciudad').value;
      const np = document.getElementById('pf-pass').value;
      if (np) currentUser.pass = np;
      AuthService.actualizarPerfil(currentUser);
      document.getElementById('tb-user-name').textContent = currentUser.nombre;
      document.getElementById('tb-avatar').textContent    = currentUser.iniciales;
      UI.toast('✅ Perfil actualizado');
    };
  }

  return { init, renderSection, editarProducto, eliminarProducto, toggleUsuario, editarUsuario, marcarLeida, cambiarEstado };
})();

document.addEventListener('DOMContentLoaded', AdminApp.init);