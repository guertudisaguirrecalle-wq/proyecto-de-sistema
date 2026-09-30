/* =========================================================
   UTILIDADES GENERALES
   ========================================================= */

/** Formatea un número como moneda en Bolivianos. Ej: 180 -> "Bs. 180" */
function formatBs(valor) {
  const n = Number(valor) || 0;
  const conDecimales = n % 1 !== 0;
  return "Bs. " + n.toLocaleString("es-BO", {
    minimumFractionDigits: conDecimales ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** Muestra un aviso emergente (notificación) en la esquina superior derecha */
function showToast(mensaje, tipo = "success") {
  const wrap = document.getElementById("toastWrap");
  if (!wrap) return;
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `<span>${mensaje}</span>`;
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity .3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/**
 * Genera el data-URI de la imagen de reemplazo elegante (percha + etiqueta) que
 * usa toda la tienda para fotos rotas o inexistentes. Se puede pedir
 * directo (por ejemplo, para una categoría que todavía no tiene fotos
 * reales) o dejar que handleImgError lo aplique cuando una imagen falla.
 */
function dressPlaceholderDataUri(etiqueta = "Couture Byte Market") {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#F6C9D3"/>
        <stop offset="100%" stop-color="#E4D3F2"/>
      </linearGradient>
    </defs>
    <rect width="400" height="500" fill="url(#g)"/>
    <g transform="translate(200,220)" fill="none" stroke="#93697A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="0" cy="-58" r="14"/>
      <path d="M0 -44 L0 -20"/>
      <path d="M0 -20 L-55 40 L55 40 Z"/>
      <path d="M-55 10 L55 10"/>
    </g>
    <text x="200" y="330" font-family="Georgia, serif" font-size="22" fill="#93697A" text-anchor="middle">${etiqueta}</text>
    <text x="200" y="356" font-family="Arial, sans-serif" font-size="12" letter-spacing="2" fill="#B6A7A9" text-anchor="middle">COUTURE BYTE MARKET</text>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

/**
 * Plan B elegante para imágenes rotas o que no cargan.
 * Genera una imagen de reemplazo SVG en los colores de la marca, con
 * un pequeño ícono de percha, para que NUNCA se vea un ícono
 * de imagen rota en la tienda.
 * Uso: <img src="..." onerror="handleImgError(this,'vestido')">
 */
function handleImgError(imgEl, etiqueta = "Couture Byte Market") {
  // Evita bucles infinitos si la propia imagen de reemplazo fallara
  imgEl.onerror = null;
  imgEl.src = dressPlaceholderDataUri(etiqueta);
  imgEl.classList.add("img-fallback");
}

/** Espera a que la persona deje de escribir antes de buscar (técnica «debounce») */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Abre una ventana emergente (agrega la clase .open al fondo oscuro y bloquea el desplazamiento) */
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

/** Cierra una ventana emergente */
function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("open");
  document.body.style.overflow = "";
}

/** Escapa HTML para evitar inyección al mostrar texto de usuarios/productos */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Valida un correo electrónico de forma básica */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Valida un teléfono (7 a 15 dígitos, admite espacios/guiones) */
function isValidPhone(phone) {
  const clean = phone.replace(/[\s\-()]/g, "");
  return /^\d{7,15}$/.test(clean);
}

/* =========================================================
   IMAGEN AMPLIADA (ventana con la foto en grande)
   Se usa tanto en la tienda (foto del producto en la ventana emergente de
   detalle) como en el panel admin (miniaturas de pedidos, clientes,
   reseñas y el ranking de productos más vendidos). Vive en utils.js
   porque ambas páginas (index.html y admin.html) lo comparten.
   Uso: <img onclick="openLightbox(url, 'Nombre del producto')">
   ========================================================= */
function openLightbox(src, alt) {
  if (!src) return; // si no hay foto real, no tiene sentido ampliar la imagen de reemplazo
  const overlay = document.getElementById("lightboxOverlay");
  const img = document.getElementById("lightboxImg");
  if (!overlay || !img) return;
  img.src = src;
  img.alt = alt || "";
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const overlay = document.getElementById("lightboxOverlay");
  if (!overlay) return;
  overlay.classList.remove("open");
  // Si queda alguna otra ventana emergente abierta (ej. el detalle de producto o de
  // pedido desde donde se abrió la imagen), el desplazamiento sigue bloqueado.
  if (!document.querySelector(".modal-overlay.open, .product-modal.open")) {
    document.body.style.overflow = "";
  }
}

function setupLightbox() {
  const overlay = document.getElementById("lightboxOverlay");
  const closeBtn = document.getElementById("lightboxClose");
  if (!overlay) return;
  overlay.addEventListener("click", closeLightbox);
  if (closeBtn) closeBtn.addEventListener("click", (e) => { e.stopPropagation(); closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeLightbox();
  });
}

/** Convierte un arreglo de filas a un archivo CSV (se abre bien en Excel)
 *  y dispara su descarga. Se usa para "Exportar ventas" y "Exportar
 *  stock bajo" en Estadísticas. */
function downloadCsv(filename, headers, rows) {
  const escapeCsv = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escapeCsv).join(",")];
  rows.forEach((r) => lines.push(r.map(escapeCsv).join(",")));
  const csv = "\uFEFF" + lines.join("\n"); // BOM (marca invisible al inicio) para que Excel muestre bien las tildes
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
