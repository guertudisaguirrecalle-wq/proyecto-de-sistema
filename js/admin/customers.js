/* =========================================================
   ADMIN — Clientes
   Muestra los clientes que se registraron automáticamente al
   completar un pedido (no hay registro manual de clientes).
   Cada fila es clicable y muestra el detalle: todos sus pedidos,
   con fecha, estado y total — y cada pedido se puede abrir para
   ver sus prendas con foto.
   ========================================================= */

let ADMIN_CUSTOMERS = [];

const AdminCustomers = {
  // Trae los clientes junto con sus pedidos.
  async fetchAll() {
    const { data, error } = await sb
      .from("clientes")
      .select("id, nombre_completo, telefono, correo, created_at, pedidos(id, total, estado, created_at)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }
    ADMIN_CUSTOMERS = data || [];
    return ADMIN_CUSTOMERS;
  },
};

// Carga los clientes y dibuja la tabla.
async function loadCustomersTable() {
  const tbody = document.getElementById("customersTableBody");
  tbody.innerHTML = `<tr><td colspan="5" class="empty-admin">Cargando clientes...</td></tr>`;

  await AdminCustomers.fetchAll();
  renderCustomersTable();
}

// Dibuja una fila por cada cliente.
function renderCustomersTable() {
  const tbody = document.getElementById("customersTableBody");

  if (!ADMIN_CUSTOMERS.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-admin">Todavía no hay clientes registrados. Aparecerán aquí apenas se complete el primer pedido.</td></tr>`;
    return;
  }

  tbody.innerHTML = ADMIN_CUSTOMERS.map((c) => {
    const fecha = new Date(c.created_at).toLocaleDateString("es-BO", {
      day: "2-digit", month: "short", year: "numeric",
    });
    const pedidos = c.pedidos || [];
    const nPedidos = pedidos.length;
    const totalGastado = pedidos
      .filter((p) => p.estado !== "cancelado")
      .reduce((s, p) => s + Number(p.total), 0);

    return `
    <tr style="cursor:pointer;" onclick="openCustomerDetail('${c.id}')">
      <td><div class="admin-prod-name">${escapeHtml(c.nombre_completo)}</div></td>
      <td>${escapeHtml(c.telefono)}</td>
      <td>${escapeHtml(c.correo)}</td>
      <td>${nPedidos} pedido${nPedidos === 1 ? "" : "s"} · <b>${formatBs(totalGastado)}</b></td>
      <td>${fecha}</td>
    </tr>`;
  }).join("");
}

// Abre el detalle de un cliente con su historial de pedidos.
function openCustomerDetail(id) {
  const c = ADMIN_CUSTOMERS.find((x) => x.id === id);
  if (!c) return;

  const pedidos = [...(c.pedidos || [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const totalGastado = pedidos
    .filter((p) => p.estado !== "cancelado")
    .reduce((s, p) => s + Number(p.total), 0);

  const filasPedidos = pedidos.length
    ? pedidos.map((p) => {
        const fecha = new Date(p.created_at).toLocaleDateString("es-BO", {
          day: "2-digit", month: "short", year: "numeric",
        });
        const estado = ESTADO_LABELS[p.estado] || ESTADO_LABELS.pendiente;
        return `
        <div class="customer-order-row" onclick="closeModal('customerDetailModal'); openOrderDetailById('${p.id}');">
          <div class="customer-order-info">
            <span class="customer-order-date">${fecha}</span>
            <span class="badge ${estado.clase}">${estado.texto}</span>
          </div>
          <div class="customer-order-right">
            <b>${formatBs(p.total)}</b>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>`;
      }).join("")
    : `<p class="empty-admin" style="padding:14px 0;">Este cliente todavía no tiene pedidos.</p>`;

  document.getElementById("customerDetailContent").innerHTML = `
    <div style="margin-bottom:18px; font-size:14px; color:var(--text-soft); line-height:1.8;">
      <div><b style="color:var(--text);">Nombre:</b> ${escapeHtml(c.nombre_completo)}</div>
      <div><b style="color:var(--text);">Teléfono:</b> ${escapeHtml(c.telefono)}</div>
      <div><b style="color:var(--text);">Correo:</b> ${escapeHtml(c.correo)}</div>
    </div>
    <div class="stats-row" style="margin-bottom:18px;">
      <div class="stat-card"><span>Pedidos</span><b>${pedidos.length}</b></div>
      <div class="stat-card"><span>Total gastado</span><b>${formatBs(totalGastado)}</b></div>
    </div>
    <label style="font-size:13px; font-weight:700; display:block; margin-bottom:8px;">Historial de pedidos</label>
    <div class="customer-orders-list">${filasPedidos}</div>
  `;

  openModal("customerDetailModal");
}
