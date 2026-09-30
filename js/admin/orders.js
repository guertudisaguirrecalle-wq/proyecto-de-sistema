/* =========================================================
   ADMIN — Pedidos
   Muestra el historial de pedidos con sus productos, tallas,
   cantidades y totales. Solo lectura (los pedidos se crean
   desde la tienda, vía la función crear_pedido en Supabase).
   ========================================================= */

let ADMIN_ORDERS = [];

/* ---------- Notificación de pedidos nuevos (numerito de aviso en el menú) ----------
   La marca de "hasta cuándo ya vi los pedidos" se guarda en Supabase
   (tabla admin_estado), no en el navegador, para que el aviso esté
   igual sin importar desde qué dispositivo entres al panel. */

async function fetchPedidosVistosHasta() {
  const { data, error } = await sb.from("admin_estado").select("pedidos_vistos_hasta").eq("id", 1).single();
  if (error || !data) return new Date(0).toISOString(); // si falla, se asume que nada se ha visto
  return data.pedidos_vistos_hasta;
}

/** Se llama al iniciar el panel para que el numerito ya aparezca en el
 *  menú lateral aunque todavía no se haya entrado a la pestaña "Pedidos". */
async function refreshPedidosBadge() {
  const badge = document.getElementById("pedidosNuevosBadge");
  if (!badge) return;

  const vistosHasta = await fetchPedidosVistosHasta();
  const { count, error } = await sb
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .gt("created_at", vistosHasta);
  if (error) return;

  if (count > 0) {
    badge.textContent = count;
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

/** Se llama apenas se entra a la pestaña "Pedidos": marca todo como
 *  visto (sin que la clienta o el admin tengan que apretar nada más)
 *  y oculta el numerito de aviso de inmediato. */
async function marcarPedidosVistos() {
  const badge = document.getElementById("pedidosNuevosBadge");
  if (badge) badge.style.display = "none"; // respuesta inmediata, no espera a Supabase

  const { error } = await sb
    .from("admin_estado")
    .update({ pedidos_vistos_hasta: new Date().toISOString() })
    .eq("id", 1);
  if (error) console.error("No se pudo marcar los pedidos como vistos:", error);
}

// Consultas de pedidos a Supabase.
const AdminOrders = {
  // Trae todos los pedidos con su cliente y el detalle de productos.
  async fetchAll() {
    const { data, error } = await sb
      .from("pedidos")
      .select(`
        id, total, estado, created_at,
        clientes ( nombre_completo, telefono, correo ),
        detalle_pedidos ( id, talla, cantidad, precio_unitario, subtotal, productos ( nombre, imagen_url, categorias ( nombre ) ) )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }
    ADMIN_ORDERS = data || [];
    return ADMIN_ORDERS;
  },

  // Cambia el estado de un pedido usando la función de Supabase
  // "actualizar_estado_pedido", que además devuelve o vuelve a
  // descontar el stock según corresponda (ver sql/09_actualizar_estado_pedido.sql).
  // No se hace con un UPDATE directo a la tabla porque eso dejaría el
  // stock desincronizado al cancelar o reactivar un pedido.
  async updateEstado(id, estado) {
    const { error } = await sb.rpc("actualizar_estado_pedido", {
      p_pedido_id: id,
      p_nuevo_estado: estado,
    });
    if (error) throw error;
  },
};

// Texto y color (clase CSS) que se muestra para cada estado de pedido.
const ESTADO_LABELS = {
  pendiente: { texto: "Pendiente", clase: "badge-warn" },
  confirmado: { texto: "Confirmado", clase: "badge-ok" },
  enviado: { texto: "Enviado", clase: "badge-ok" },
  cancelado: { texto: "Cancelado", clase: "badge-off" },
};

// Carga los pedidos y dibuja los totales y la tabla.
async function loadOrdersTable() {
  const tbody = document.getElementById("ordersTableBody");
  tbody.innerHTML = `<tr><td colspan="6" class="empty-admin">Cargando pedidos...</td></tr>`;

  await AdminOrders.fetchAll();
  renderOrderStats();
  renderOrdersTable();
}

// Calcula y muestra las tarjetas de resumen de pedidos.
function renderOrderStats() {
  const total = ADMIN_ORDERS.length;
  const pendientes = ADMIN_ORDERS.filter((o) => o.estado === "pendiente").length;
  const ventasTotal = ADMIN_ORDERS
    .filter((o) => o.estado !== "cancelado")
    .reduce((s, o) => s + Number(o.total), 0);

  document.getElementById("orderStats").innerHTML = `
    <div class="stat-card"><span>Pedidos totales</span><b>${total}</b></div>
    <div class="stat-card"><span>Pendientes</span><b>${pendientes}</b></div>
    <div class="stat-card"><span>Ventas registradas</span><b>${formatBs(ventasTotal)}</b></div>
  `;
}

// Dibuja una fila por cada pedido.
function renderOrdersTable() {
  const tbody = document.getElementById("ordersTableBody");

  if (!ADMIN_ORDERS.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-admin">Todavía no se ha registrado ningún pedido.</td></tr>`;
    return;
  }

  tbody.innerHTML = ADMIN_ORDERS.map((o) => {
    const fecha = new Date(o.created_at).toLocaleDateString("es-BO", {
      day: "2-digit", month: "short", year: "numeric",
    });
    const cliente = o.clientes || {};
    const nProductos = (o.detalle_pedidos || []).reduce((s, d) => s + d.cantidad, 0);
    const estado = ESTADO_LABELS[o.estado] || ESTADO_LABELS.pendiente;

    return `
    <tr style="cursor:pointer;" onclick="openOrderDetail('${o.id}')">
      <td>${fecha}</td>
      <td>${escapeHtml(cliente.nombre_completo || "—")}</td>
      <td>${escapeHtml(cliente.telefono || "—")}</td>
      <td>${nProductos} prenda(s)</td>
      <td><b>${formatBs(o.total)}</b></td>
      <td><span class="badge ${estado.clase}">${estado.texto}</span></td>
    </tr>`;
  }).join("");
}

// Abre el detalle de un pedido que ya está cargado en memoria.
function openOrderDetail(id) {
  const o = ADMIN_ORDERS.find((x) => x.id === id);
  if (!o) return;
  renderOrderDetailModal(o, { readonly: false });
}

/** Abre el detalle de un pedido a partir de su ID, consultándolo directo
 * a Supabase. Se usa desde la vista de Clientes, donde puede que el
 * pedido todavía no esté cargado en ADMIN_ORDERS (esa lista solo se
 * llena al visitar la pestaña "Pedidos"). Se muestra en modo solo
 * lectura: el estado del pedido solo se cambia desde "Pedidos". */
async function openOrderDetailById(id) {
  const { data, error } = await sb
    .from("pedidos")
    .select(`
      id, total, estado, created_at,
      clientes ( nombre_completo, telefono, correo ),
      detalle_pedidos ( id, talla, cantidad, precio_unitario, subtotal, productos ( nombre, imagen_url, categorias ( nombre ) ) )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error(error);
    showToast("No se pudo cargar el detalle de este pedido.", "error");
    return;
  }
  renderOrderDetailModal(data, { readonly: true });
}

// Arma el contenido del detalle del pedido (cliente, productos y estado).
function renderOrderDetailModal(o, { readonly = false } = {}) {
  const cliente = o.clientes || {};
  const fecha = new Date(o.created_at).toLocaleString("es-BO");

  const filas = (o.detalle_pedidos || []).map((d) => {
    const prod = d.productos || {};
    const catNombre = prod.categorias ? prod.categorias.nombre : "";
    return `
    <div class="order-summary-row">
      <div class="osr-thumb">
        <img src="${prod.imagen_url || ""}" alt="" onerror="handleImgError(this,'${escapeHtml(catNombre || (prod.nombre || "prenda"))}')"
             onclick="openLightbox('${(prod.imagen_url || "").replace(/'/g, "\\'")}','${escapeHtml((prod.nombre || "Producto").replace(/'/g, "\\'"))}')">
      </div>
      <div class="osr-info">
        <span class="osr-name">${escapeHtml(prod.nombre || "Producto")}</span>
        <span class="osr-meta">Talla ${escapeHtml(d.talla)} × ${d.cantidad}</span>
      </div>
      <span class="osr-price">${formatBs(d.subtotal)}</span>
    </div>`;
  }).join("");

  const estadoActual = ESTADO_LABELS[o.estado] || ESTADO_LABELS.pendiente;
  const estadoBloque = readonly
    ? `
      <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-alt); padding:12px 16px; border-radius:var(--radius-sm);">
        <span style="font-size:13px; font-weight:700;">Estado del pedido</span>
        <span class="badge ${estadoActual.clase}">${estadoActual.texto}</span>
      </div>
      <p class="form-hint" style="margin-top:8px;">El estado del pedido solo se puede cambiar desde la pestaña "Pedidos".</p>`
    : `
      <label style="font-size:13px; font-weight:700; display:block; margin-bottom:8px;">Estado del pedido</label>
      <select class="select-elegant" id="orderEstadoSelect" style="width:100%;" onchange="changeOrderEstado('${o.id}', this.value)">
        ${Object.entries(ESTADO_LABELS).map(([val, l]) =>
          `<option value="${val}" ${o.estado === val ? "selected" : ""}>${l.texto}</option>`
        ).join("")}
      </select>`;

  document.getElementById("orderDetailContent").innerHTML = `
    <div style="margin-bottom:16px; font-size:14px; color:var(--text-soft); line-height:1.8;">
      <div><b style="color:var(--text);">Cliente:</b> ${escapeHtml(cliente.nombre_completo || "—")}</div>
      <div><b style="color:var(--text);">Teléfono:</b> ${escapeHtml(cliente.telefono || "—")}</div>
      <div><b style="color:var(--text);">Correo:</b> ${escapeHtml(cliente.correo || "—")}</div>
      <div><b style="color:var(--text);">Fecha:</b> ${fecha}</div>
    </div>
    <div class="order-summary-box">${filas}</div>
    <div class="cart-total-row" style="margin:16px 0;"><span>Total</span><b>${formatBs(o.total)}</b></div>
    ${estadoBloque}
  `;
  openModal("orderDetailModal");
}

// Guarda el nuevo estado del pedido y recarga la tabla.
async function changeOrderEstado(id, estado) {
  try {
    await AdminOrders.updateEstado(id, estado);
    const mensaje = estado === "cancelado"
      ? "Pedido cancelado. El stock de las tallas fue devuelto."
      : "Estado del pedido actualizado.";
    showToast(mensaje, "success");
    await loadOrdersTable();
  } catch (err) {
    console.error(err);
    showToast(explicarErrorEstadoPedido(err), "error");

    // El <select> del modal ya quedó visualmente en el valor nuevo aunque
    // la base de datos no cambió (la función falló). Se vuelve a dibujar
    // el modal con el estado real para que no quede desincronizado.
    const o = ADMIN_ORDERS.find((x) => x.id === id);
    if (o) renderOrderDetailModal(o, { readonly: false });
  }
}

// Traduce los códigos de error que puede lanzar actualizar_estado_pedido
// (ver sql/09_actualizar_estado_pedido.sql) a un mensaje claro para el admin.
function explicarErrorEstadoPedido(err) {
  const msg = err?.message || "";
  if (msg.startsWith("STOCK_INSUFICIENTE_REACTIVAR")) {
    const [, talla, stock] = msg.split(":");
    return `No se puede reactivar: ya no hay stock suficiente en la talla ${talla} (quedan ${stock}).`;
  }
  if (msg.startsWith("PEDIDO_NO_ENCONTRADO")) {
    return "Este pedido ya no existe.";
  }
  return "No se pudo actualizar el estado del pedido.";
}
