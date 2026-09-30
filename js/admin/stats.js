/* =========================================================
   ADMIN — Estadísticas
   Calcula y muestra gráficos reales a partir de los pedidos ya
   registrados en Supabase (no hay datos inventados). Usa Chart.js
   (cargado por CDN en admin.html).

   Organización:
   1) Funciones que TRAEN datos de Supabase
   2) Funciones que CALCULAN/AGRUPAN esos datos
   3) Funciones que DIBUJAN cada gráfico, tabla o alerta
   ========================================================= */

let STATS_CHARTS = { dia: null, categorias: null, mejorDia: null };
let STATS_PEDIDOS_ACTUALES = [];

/* ---------------------------------------------------------
   1) TRAER DATOS DE SUPABASE
   --------------------------------------------------------- */

async function fetchStatsData(dias) {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const { data, error } = await sb
    .from("pedidos")
    .select(`
      id, total, estado, created_at, cliente_id,
      detalle_pedidos ( cantidad, subtotal, productos ( id, nombre, imagen_url, categorias ( nombre ) ) )
    `)
    .gte("created_at", desde.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }
  return data || [];
}

/** Igual que fetchStatsData, pero para el tramo ANTERIOR al actual —
 * así se puede comparar "¿vendí más o menos que el período pasado?". */
async function fetchStatsDataRango(diasDesde, diasHasta) {
  const desde = new Date();
  desde.setDate(desde.getDate() - diasDesde);
  const hasta = new Date();
  hasta.setDate(hasta.getDate() - diasHasta);

  const { data, error } = await sb
    .from("pedidos")
    .select(`id, total, estado, created_at, cliente_id`)
    .gte("created_at", desde.toISOString())
    .lt("created_at", hasta.toISOString());

  if (error) {
    console.error(error);
    return [];
  }
  return data || [];
}

/** Trae el stock ACTUAL de cada producto (sumando todas sus tallas). */
async function fetchStockPorProducto() {
  const { data, error } = await sb.from("producto_tallas").select("producto_id, stock");
  if (error) {
    console.error(error);
    return {};
  }
  const stockPorProducto = {};
  (data || []).forEach((fila) => {
    stockPorProducto[fila.producto_id] = (stockPorProducto[fila.producto_id] || 0) + fila.stock;
  });
  return stockPorProducto;
}

// Devuelve n colores de la paleta de la marca (se repiten si hacen falta más).
function paletaColores(n) {
  const base = ["#E27B95", "#7C4FA6", "#E3B79C", "#7E9E7A", "#B8823B", "#93697A", "#E4D3F2", "#B23E62"];
  const out = [];
  for (let i = 0; i < n; i++) out.push(base[i % base.length]);
  return out;
}

/* ---------------------------------------------------------
   FUNCIÓN PRINCIPAL
   --------------------------------------------------------- */
async function loadStatsView() {
  const dias = parseInt(document.getElementById("statsRangeSelect").value, 10);

  const [pedidos, pedidosPeriodoAnterior, stockPorProducto] = await Promise.all([
    fetchStatsData(dias),
    fetchStatsDataRango(dias * 2, dias),
    fetchStockPorProducto(),
  ]);

  const pedidosValidos = pedidos.filter((p) => p.estado !== "cancelado");
  const pedidosAnterioresValidos = pedidosPeriodoAnterior.filter((p) => p.estado !== "cancelado");
  STATS_PEDIDOS_ACTUALES = pedidosValidos;

  renderStatsSummary(pedidosValidos, dias);
  await renderComparativaYClientas(pedidosValidos, pedidosAnterioresValidos, dias);
  renderChartVentasDia(pedidosValidos, dias);
  renderChartCategorias(pedidosValidos);
  renderChartMejorDia(pedidosValidos);

  const ranking = calcularRankingProductos(pedidosValidos, stockPorProducto);
  renderRankingProductos(ranking);
  renderTablaTopProductos(ranking);
  renderAlertaProductoEstrella(ranking);
  renderStockMuerto(ranking, stockPorProducto);

  await loadStockBajoReport();
}

/* ---------------------------------------------------------
   2) CALCULAR / AGRUPAR
   --------------------------------------------------------- */

/** Compara el período actual contra el mismo largo de días inmediatamente
 * anterior, y calcula cuántas clientas de este período son nuevas
 * (primera compra) o recurrentes (ya habían comprado antes). */
async function renderComparativaYClientas(pedidosActuales, pedidosAnteriores, dias) {
  const totalActual = pedidosActuales.reduce((s, p) => s + Number(p.total), 0);
  const totalAnterior = pedidosAnteriores.reduce((s, p) => s + Number(p.total), 0);
  const variacion = totalAnterior > 0
    ? ((totalActual - totalAnterior) / totalAnterior) * 100
    : (totalActual > 0 ? 100 : 0);
  const subio = variacion >= 0;

  const idsClientesActuales = [...new Set(pedidosActuales.map((p) => p.cliente_id).filter(Boolean))];
  let nuevas = idsClientesActuales.length;
  let recurrentes = 0;

  if (idsClientesActuales.length) {
    const desdeActual = new Date();
    desdeActual.setDate(desdeActual.getDate() - dias);

    const { data: pedidosPrevios } = await sb
      .from("pedidos")
      .select("cliente_id")
      .in("cliente_id", idsClientesActuales)
      .lt("created_at", desdeActual.toISOString());

    const idsConHistorial = new Set((pedidosPrevios || []).map((p) => p.cliente_id));
    recurrentes = idsClientesActuales.filter((id) => idsConHistorial.has(id)).length;
    nuevas = idsClientesActuales.length - recurrentes;
  }

  document.getElementById("statsComparativaRow").innerHTML = `
    <div class="stat-card">
      <span>Ventas vs. período anterior</span>
      <b style="color:${subio ? "#1E9E5A" : "#D8434B"};">${subio ? "▲" : "▼"} ${Math.abs(variacion).toFixed(0)}%</b>
      <span style="font-size:11px; color:var(--text-faint);">antes: ${formatBs(totalAnterior)}</span>
    </div>
    <div class="stat-card">
      <span>Clientas nuevas</span><b>${nuevas}</b>
      <span style="font-size:11px; color:var(--text-faint);">primera compra en este período</span>
    </div>
    <div class="stat-card">
      <span>Clientas recurrentes</span><b>${recurrentes}</b>
      <span style="font-size:11px; color:var(--text-faint);">ya habían comprado antes</span>
    </div>
  `;
}

// Muestra las tarjetas resumen: ventas totales, pedidos, ticket promedio y prendas vendidas.
function renderStatsSummary(pedidos, dias) {
  const totalVentas = pedidos.reduce((s, p) => s + Number(p.total), 0);
  const totalPedidos = pedidos.length;
  const ticketPromedio = totalPedidos ? totalVentas / totalPedidos : 0;
  const prendas = pedidos.reduce(
    (s, p) => s + (p.detalle_pedidos || []).reduce((s2, d) => s2 + d.cantidad, 0),
    0
  );

  document.getElementById("statsSummaryRow").innerHTML = `
    <div class="stat-card"><span>Ventas (${dias} días)</span><b>${formatBs(totalVentas)}</b></div>
    <div class="stat-card"><span>Pedidos</span><b>${totalPedidos}</b></div>
    <div class="stat-card"><span>Ticket promedio</span><b>${formatBs(ticketPromedio)}</b></div>
    <div class="stat-card"><span>Prendas vendidas</span><b>${prendas}</b></div>
  `;
}

/** Ranking de productos más vendidos: unidades, ingresos, stock actual
 * e imagen — combina lo que se vendió con lo que queda disponible. */
function calcularRankingProductos(pedidos, stockPorProducto) {
  const porProducto = {};

  pedidos.forEach((p) => {
    (p.detalle_pedidos || []).forEach((d) => {
      const prod = d.productos;
      if (!prod) return; // el producto pudo haber sido eliminado después de la venta
      if (!porProducto[prod.id]) {
        porProducto[prod.id] = {
          id: prod.id, nombre: prod.nombre, imagen_url: prod.imagen_url || "",
          categoria: prod.categorias ? prod.categorias.nombre : "",
          unidades: 0, ingresos: 0,
        };
      }
      porProducto[prod.id].unidades += d.cantidad;
      porProducto[prod.id].ingresos += Number(d.subtotal);
    });
  });

  return Object.values(porProducto)
    .map((p) => ({ ...p, stockActual: stockPorProducto[p.id] ?? 0 }))
    .sort((a, b) => b.unidades - a.unidades);
}

/* ---------------------------------------------------------
   3) DIBUJAR GRÁFICOS, TABLAS Y ALERTAS
   --------------------------------------------------------- */

function renderChartVentasDia(pedidos, dias) {
  const porDia = {};
  const hoy = new Date();
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    porDia[key] = 0;
  }
  pedidos.forEach((p) => {
    const key = p.created_at.slice(0, 10);
    if (key in porDia) porDia[key] += Number(p.total);
  });

  const labels = Object.keys(porDia).map((k) => {
    const d = new Date(k + "T00:00:00");
    return d.toLocaleDateString("es-BO", { day: "2-digit", month: "short" });
  });
  const valores = Object.values(porDia);

  if (STATS_CHARTS.dia) STATS_CHARTS.dia.destroy();
  const ctx = document.getElementById("chartVentasDia").getContext("2d");
  STATS_CHARTS.dia = new Chart(ctx, {
    type: dias > 30 ? "line" : "bar",
    data: {
      labels,
      datasets: [{
        label: "Ventas (Bs.)",
        data: valores,
        backgroundColor: "rgba(201,139,146,0.35)",
        borderColor: "#E27B95",
        borderWidth: 2,
        borderRadius: 6,
        tension: 0.3,
        fill: dias > 30,
        pointRadius: dias > 30 ? 2 : 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }, grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "#F0E4D7" } },
      },
    },
  });
}

// Gráfico de las ventas agrupadas por categoría.
function renderChartCategorias(pedidos) {
  const porCategoria = {};
  pedidos.forEach((p) => {
    (p.detalle_pedidos || []).forEach((d) => {
      const cat = d.productos?.categorias?.nombre || "Sin categoría";
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(d.subtotal);
    });
  });

  const labels = Object.keys(porCategoria);
  const valores = Object.values(porCategoria);

  if (STATS_CHARTS.categorias) STATS_CHARTS.categorias.destroy();
  const ctx = document.getElementById("chartCategorias").getContext("2d");

  if (!labels.length) {
    ctx.canvas.parentElement.innerHTML = `<p class="empty-admin">Todavía no hay ventas registradas en este período.</p>`;
    return;
  }

  STATS_CHARTS.categorias = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: valores, backgroundColor: paletaColores(labels.length), borderWidth: 2, borderColor: "#fff" }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
    },
  });
}

/** Agrupa las ventas por día de la semana, sin importar la fecha
 * exacta, para saber qué día conviene publicar promociones. */
function renderChartMejorDia(pedidos) {
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const totalPorDia = [0, 0, 0, 0, 0, 0, 0];

  pedidos.forEach((p) => {
    const diaSemana = new Date(p.created_at).getDay();
    totalPorDia[diaSemana] += Number(p.total);
  });

  if (STATS_CHARTS.mejorDia) STATS_CHARTS.mejorDia.destroy();
  const ctx = document.getElementById("chartMejorDia").getContext("2d");

  if (!totalPorDia.some((v) => v > 0)) {
    ctx.canvas.parentElement.innerHTML = `<p class="empty-admin">Todavía no hay ventas registradas en este período.</p>`;
    return;
  }

  const mejorIndice = totalPorDia.indexOf(Math.max(...totalPorDia));
  const colores = totalPorDia.map((_, i) => (i === mejorIndice ? "#FF6B1A" : "#E3B79C"));

  STATS_CHARTS.mejorDia = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dias.map((d) => d.slice(0, 3)),
      datasets: [{ data: totalPorDia, backgroundColor: colores, borderRadius: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "#F0E4D7" } },
      },
    },
  });
}

/** Ranking visual (con foto real, ampliable) de los productos más
 * vendidos en el período. */
function renderRankingProductos(ranking) {
  const wrap = document.getElementById("topProductosRanking");
  if (!wrap) return;

  const top6 = ranking.slice(0, 6);
  if (!top6.length) {
    wrap.innerHTML = `<p class="empty-admin">Todavía no hay ventas registradas en este período.</p>`;
    return;
  }

  const max = top6[0].unidades;

  wrap.innerHTML = top6.map((p, i) => {
    const pct = Math.max((p.unidades / max) * 100, 6);
    return `
    <div class="tpr-row">
      <span class="tpr-rank">${i === 0 ? "⭐" : "#" + (i + 1)}</span>
      <div class="tpr-thumb">
        <img src="${p.imagen_url || ""}" alt="" onerror="handleImgError(this,'${escapeHtml(p.categoria)}')"
             onclick="openLightbox('${(p.imagen_url || "").replace(/'/g, "\\'")}','${escapeHtml(p.nombre.replace(/'/g, "\\'"))}')">
      </div>
      <div class="tpr-body">
        <div class="tpr-top">
          <span class="tpr-name">${escapeHtml(p.nombre)}</span>
          <span class="tpr-count">${p.unidades} unid.</span>
        </div>
        <div class="tpr-bar-track"><div class="tpr-bar-fill" style="--tpr-pct:${pct}%"></div></div>
      </div>
    </div>`;
  }).join("");
}

/** Tabla debajo del ranking: unidades, ingresos y stock actual de
 * cada producto, para complementar la foto rápida con el detalle. */
function renderTablaTopProductos(ranking) {
  const tbody = document.getElementById("topProductosTablaBody");
  if (!tbody) return;
  const top10 = ranking.slice(0, 10);

  if (!top10.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-admin">Todavía no hay ventas en este período.</td></tr>`;
    return;
  }

  tbody.innerHTML = top10.map((p, i) => {
    let stockBadge = `<span class="badge badge-ok">${p.stockActual} unid.</span>`;
    if (p.stockActual <= 0) stockBadge = `<span class="badge badge-warn">Agotado</span>`;
    else if (p.stockActual <= 5) stockBadge = `<span class="badge badge-warn">${p.stockActual} unid. (bajo)</span>`;

    return `
    <tr>
      <td><b>#${i + 1}</b></td>
      <td>${escapeHtml(p.nombre)}</td>
      <td>${p.unidades}</td>
      <td>${formatBs(p.ingresos)}</td>
      <td>${stockBadge}</td>
    </tr>`;
  }).join("");
}

/** ALERTA — "producto estrella con poco stock": de los 5 productos que
 * más se venden, ¿cuáles se están quedando sin stock? Reponer esos
 * primero, porque son los que más ventas sostienen. */
function renderAlertaProductoEstrella(ranking) {
  const box = document.getElementById("alertaProductoEstrella");
  if (!box) return;
  const UMBRAL_STOCK_BAJO = 5;

  const top5 = ranking.slice(0, 5);
  const enRiesgo = top5.filter((p) => p.stockActual <= UMBRAL_STOCK_BAJO);

  if (!enRiesgo.length) {
    box.style.display = "none";
    box.innerHTML = "";
    return;
  }

  box.style.display = "block";
  box.innerHTML = `
    <div class="admin-panel" style="padding:18px 22px; border-left:4px solid #B8823B; background:#FCF3E9;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
        <span style="font-size:20px;">⚠️</span>
        <h3 style="margin:0; color:#8A5F1F;">Atención: producto${enRiesgo.length > 1 ? "s" : ""} estrella con poco stock</h3>
      </div>
      <p style="font-size:13.5px; color:#6B5030; margin-bottom:10px;">
        ${enRiesgo.length > 1 ? "Estos productos están" : "Este producto está"} entre los más vendidos de tu tienda,
        pero se ${enRiesgo.length > 1 ? "están quedando" : "está quedando"} sin stock. Conviene reponer${enRiesgo.length > 1 ? "los" : "lo"} antes que otros.
      </p>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${enRiesgo.map((p) => `
          <div style="display:flex; justify-content:space-between; font-size:13.5px;">
            <span><b>${escapeHtml(p.nombre)}</b> — ${p.unidades} unidades vendidas en este período</span>
            <span style="font-weight:700; color:${p.stockActual <= 0 ? "#D8434B" : "#B8823B"};">
              ${p.stockActual <= 0 ? "Agotado" : `Quedan ${p.stockActual} unid.`}
            </span>
          </div>`).join("")}
      </div>
    </div>
  `;
}

/** "Stock muerto": productos activos con stock disponible que no
 * vendieron ni una unidad en este período — candidatos a bajar de
 * precio, dejar de reponer, o revisar por qué no se venden. */
function renderStockMuerto(ranking, stockPorProducto) {
  const tbody = document.getElementById("stockMuertoTablaBody");
  if (!tbody) return;

  const idsQueSiVendieron = new Set(ranking.map((p) => p.id));
  const sinVentas = (ADMIN_PRODUCTS || []).filter((p) => {
    const stock = stockPorProducto[p.id] ?? 0;
    return p.activo && stock > 0 && !idsQueSiVendieron.has(p.id);
  });

  if (!sinVentas.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-admin">Todos tus productos con stock tuvieron al menos una venta en este período. ✓</td></tr>`;
    return;
  }

  tbody.innerHTML = sinVentas.slice(0, 15).map((p) => `
    <tr>
      <td><b>${escapeHtml(p.nombre)}</b></td>
      <td>${escapeHtml(p.categorias?.nombre || "—")}</td>
      <td>${stockPorProducto[p.id] ?? 0} unid.</td>
      <td>${formatBs(p.precio)}</td>
    </tr>`).join("");
}

/* ---------- Exportar ventas a CSV (se abre bien en Excel) ---------- */
function exportarVentasCsv() {
  if (!STATS_PEDIDOS_ACTUALES.length) {
    showToast("No hay ventas en este período para exportar.", "error");
    return;
  }
  const headers = ["Fecha", "N° Pedido", "Producto", "Cantidad", "Subtotal (Bs)"];
  const rows = [];
  STATS_PEDIDOS_ACTUALES.forEach((p) => {
    const fecha = new Date(p.created_at).toLocaleDateString("es-BO");
    (p.detalle_pedidos || []).forEach((d) => {
      rows.push([
        fecha,
        p.id.slice(0, 8),
        d.productos ? d.productos.nombre : "Producto eliminado",
        d.cantidad,
        Number(d.subtotal).toFixed(2),
      ]);
    });
  });
  downloadCsv(`ventas_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  showToast("Reporte de ventas descargado.", "success");
}

/* ---------- Exportar ventas a PDF (para compartir o imprimir) ---------- */
function exportarVentasPdf() {
  if (!STATS_PEDIDOS_ACTUALES.length) {
    showToast("No hay ventas en este período para exportar.", "error");
    return;
  }
  const headers = [["Fecha", "N° Pedido", "Producto", "Cantidad", "Subtotal (Bs)"]];
  const rows = [];
  let totalGeneral = 0;
  STATS_PEDIDOS_ACTUALES.forEach((p) => {
    const fecha = new Date(p.created_at).toLocaleDateString("es-BO");
    (p.detalle_pedidos || []).forEach((d) => {
      const subtotal = Number(d.subtotal);
      totalGeneral += subtotal;
      rows.push([
        fecha,
        p.id.slice(0, 8),
        d.productos ? d.productos.nombre : "Producto eliminado",
        d.cantidad,
        subtotal.toFixed(2),
      ]);
    });
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Couture Byte Market — Reporte de ventas", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generado el ${new Date().toLocaleDateString("es-BO")}`, 14, 24);

  doc.autoTable({
    head: headers,
    body: rows,
    startY: 30,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [190, 130, 150] },
    foot: [["", "", "", "Total", `Bs ${totalGeneral.toFixed(2)}`]],
    footStyles: { fillColor: [245, 245, 245], textColor: 20, fontStyle: "bold" },
  });

  doc.save(`ventas_${new Date().toISOString().slice(0, 10)}.pdf`);
  showToast("Reporte de ventas (PDF) descargado.", "success");
}

/* ---------- Reporte de stock bajo / agotados (por talla) ---------- */
const UMBRAL_STOCK_BAJO_TALLA = 3;
let STATS_STOCK_BAJO = [];

// Busca las tallas con stock bajo de productos activos.
async function loadStockBajoReport() {
  const { data, error } = await sb
    .from("producto_tallas")
    .select("talla, stock, productos!inner( id, nombre, activo, categorias(nombre) )")
    .lte("stock", UMBRAL_STOCK_BAJO_TALLA)
    .eq("productos.activo", true)
    .order("stock", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }
  STATS_STOCK_BAJO = data || [];
  renderStockBajoTable();
}

// Dibuja la tabla de tallas con stock bajo.
function renderStockBajoTable() {
  const tbody = document.getElementById("stockBajoTableBody");
  const badge = document.getElementById("stockBajoCount");
  if (badge) badge.textContent = STATS_STOCK_BAJO.length;
  if (!tbody) return;

  if (!STATS_STOCK_BAJO.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-admin">✅ Todas las tallas tienen buen nivel de stock.</td></tr>`;
    return;
  }

  tbody.innerHTML = STATS_STOCK_BAJO.map((row) => {
    const prod = row.productos || {};
    const agotado = row.stock <= 0;
    return `
    <tr>
      <td>${escapeHtml(prod.nombre || "—")}</td>
      <td>${escapeHtml(prod.categorias ? prod.categorias.nombre : "—")}</td>
      <td>Talla ${escapeHtml(row.talla)}</td>
      <td><span class="badge ${agotado ? "badge-off" : "badge-warn"}">${agotado ? "Agotado" : row.stock + " unid."}</span></td>
    </tr>`;
  }).join("");
}

// Descarga el reporte de stock bajo como archivo CSV (se abre en Excel).
function exportarStockBajoCsv() {
  if (!STATS_STOCK_BAJO.length) {
    showToast("No hay tallas con stock bajo para exportar.", "error");
    return;
  }
  const headers = ["Producto", "Categoría", "Talla", "Stock actual"];
  const rows = STATS_STOCK_BAJO.map((row) => [
    row.productos ? row.productos.nombre : "",
    row.productos && row.productos.categorias ? row.productos.categorias.nombre : "",
    row.talla,
    row.stock,
  ]);
  downloadCsv(`stock_bajo_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  showToast("Reporte de stock bajo descargado.", "success");
}

/* ---------- Exportar stock bajo a PDF (para compartir o imprimir) ---------- */
function exportarStockBajoPdf() {
  if (!STATS_STOCK_BAJO.length) {
    showToast("No hay tallas con stock bajo para exportar.", "error");
    return;
  }
  const headers = [["Producto", "Categoría", "Talla", "Stock actual"]];
  const rows = STATS_STOCK_BAJO.map((row) => [
    row.productos ? row.productos.nombre : "",
    row.productos && row.productos.categorias ? row.productos.categorias.nombre : "",
    row.talla,
    row.stock <= 0 ? "Agotado" : `${row.stock} unid.`,
  ]);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Couture Byte Market — Reporte de stock bajo", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generado el ${new Date().toLocaleDateString("es-BO")}`, 14, 24);

  doc.autoTable({
    head: headers,
    body: rows,
    startY: 30,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [190, 130, 150] },
  });

  doc.save(`stock_bajo_${new Date().toISOString().slice(0, 10)}.pdf`);
  showToast("Reporte de stock bajo (PDF) descargado.", "success");
}
