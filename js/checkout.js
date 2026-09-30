/* =========================================================
   FINALIZAR COMPRA — Datos del cliente, registro del pedido y WhatsApp
   ========================================================= */

function openCheckout() {
  if (Cart.items.length === 0) {
    showToast("Tu bolsa está vacía. Agrega alguna prenda primero.", "error");
    return;
  }

  const summary = document.getElementById("checkoutSummary");
  summary.innerHTML = Cart.items
    .map(
      (i) => `
      <div class="order-summary-row">
        <span>${escapeHtml(i.nombre)} · Talla ${escapeHtml(i.talla)} × ${i.cantidad}</span>
        <span>${formatBs(i.precio * i.cantidad)}</span>
      </div>`
    )
    .join("");

  document.getElementById("checkoutTotal").textContent = formatBs(Cart.getTotal());

  const deliveryBox = document.getElementById("deliveryInfoBox");
  deliveryBox.innerHTML = `
    <div class="delivery-info-item">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      <span>${escapeHtml(APP_CONFIG.ENVIO_INFO)}</span>
    </div>`;

  renderPaymentMethods();

  Cart.close();
  openModal("checkoutModal");
}

/* ---------- Métodos de pago (QR, transferencia, efectivo) ---------- */
let SELECTED_PAYMENT_METHOD = null;
let PAYMENT_METHODS_ACTIVE = [];

// Muestra solo los métodos de pago que el admin dejó activos.
function renderPaymentMethods() {
  const wrap = document.getElementById("paymentMethodsBox");
  const mp = APP_CONFIG.METODOS_PAGO;

  PAYMENT_METHODS_ACTIVE = [];
  if (mp.qr.activo && mp.qr.imagen_url) PAYMENT_METHODS_ACTIVE.push("qr");
  if (mp.transferencia.activo) PAYMENT_METHODS_ACTIVE.push("transferencia");
  if (mp.efectivo.activo) PAYMENT_METHODS_ACTIVE.push("efectivo");

  if (!PAYMENT_METHODS_ACTIVE.length) {
    wrap.innerHTML = "";
    wrap.style.display = "none";
    SELECTED_PAYMENT_METHOD = null;
    return;
  }

  SELECTED_PAYMENT_METHOD = PAYMENT_METHODS_ACTIVE[0];

  const labels = { qr: "Pago con QR", transferencia: "Transferencia", efectivo: "Efectivo" };
  const icons = {
    qr: `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="21" y2="14"/><line x1="14" y1="21" x2="21" y2="21"/><line x1="17.5" y1="14" x2="17.5" y2="21"/>`,
    transferencia: `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8v4h8V3z"/>`,
    efectivo: `<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>`,
  };

  wrap.style.display = "flex";
  wrap.innerHTML = `
    <label style="font-size:13px; font-weight:700; display:block; margin-bottom:10px;">¿Cómo quieres pagar?</label>
    <div class="payment-tabs">
      ${PAYMENT_METHODS_ACTIVE.map((key) => `
        <button type="button" class="payment-tab ${key === SELECTED_PAYMENT_METHOD ? "active" : ""}" data-method="${key}" onclick="selectPaymentMethod('${key}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[key]}</svg>
          ${labels[key]}
        </button>`).join("")}
    </div>
    <div id="paymentMethodDetail"></div>
  `;

  renderPaymentMethodDetail();
}

// Marca el método de pago elegido y muestra sus datos.
function selectPaymentMethod(key) {
  SELECTED_PAYMENT_METHOD = key;
  document.querySelectorAll(".payment-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.method === key);
  });
  renderPaymentMethodDetail();
}

// Muestra los datos del método elegido (QR, cuenta bancaria o efectivo).
function renderPaymentMethodDetail() {
  const box = document.getElementById("paymentMethodDetail");
  const mp = APP_CONFIG.METODOS_PAGO;
  let html = "";

  if (SELECTED_PAYMENT_METHOD === "qr") {
    html = `
      <div class="payment-method-card">
        <img src="${mp.qr.imagen_url}" alt="Código QR de pago" class="payment-qr-img" onclick="openZoomQr('${mp.qr.imagen_url}')">
        <div class="payment-method-info">
          <b>${escapeHtml(mp.qr.banco || "Escanea para pagar")}</b>
          <span>${mp.qr.titular ? "A nombre de " + escapeHtml(mp.qr.titular) : ""}</span>
          <span style="font-size:11.5px; color:var(--text-faint);">Toca la imagen para verla más grande.</span>
        </div>
      </div>`;
  } else if (SELECTED_PAYMENT_METHOD === "transferencia") {
    html = `
      <div class="payment-method-card payment-method-text">
        <span><b>Banco:</b> ${escapeHtml(mp.transferencia.banco || "—")}</span>
        <span><b>Cuenta:</b> ${escapeHtml(mp.transferencia.numero_cuenta || "—")}</span>
        <span><b>A nombre de:</b> ${escapeHtml(mp.transferencia.titular || "—")}</span>
      </div>`;
  } else if (SELECTED_PAYMENT_METHOD === "efectivo") {
    html = `
      <div class="payment-method-card payment-method-text">
        <span>Pagas en efectivo en el momento en que recibes tu pedido.</span>
      </div>`;
  }

  if (SELECTED_PAYMENT_METHOD !== "efectivo") {
    html += `
      <div class="payment-note">
        💬 Después de pagar, envía tu comprobante en el mismo chat de WhatsApp para que confirmemos tu pedido.
      </div>`;
  }

  box.innerHTML = html;
}

// Muestra el QR de pago en grande (reutiliza la ventana de compartir).
function openZoomQr(url) {
  document.getElementById("shareModalTitle").textContent = "Código QR de pago";
  document.getElementById("shareModalSub").textContent = "Escanéalo desde tu app bancaria para completar el pago.";
  document.getElementById("shareQrImg").src = url;
  document.getElementById("shareLinkInput").parentElement.style.display = "none";
  document.querySelector('#shareModal button[onclick="shareViaWhatsApp()"]').style.display = "none";
  openModal("shareModal");
}


// Oculta los mensajes de error del formulario.
function clearCheckoutErrors() {
  document.querySelectorAll("#checkoutForm .form-error").forEach((e) => e.classList.remove("show"));
}

// Revisa nombre, teléfono y correo. Devuelve los datos si están bien, o null si hay errores.
function validateCheckoutForm() {
  clearCheckoutErrors();
  let valid = true;

  const nombre = document.getElementById("clienteNombre").value.trim();
  const telefono = document.getElementById("clienteTelefono").value.trim();
  const email = document.getElementById("clienteEmail").value.trim();

  if (nombre.length < 3) {
    document.getElementById("errNombre").classList.add("show");
    valid = false;
  }
  if (!isValidPhone(telefono)) {
    document.getElementById("errTelefono").classList.add("show");
    valid = false;
  }
  if (!isValidEmail(email)) {
    document.getElementById("errEmail").classList.add("show");
    valid = false;
  }

  return valid ? { nombre, telefono, email } : null;
}

/** Vuelve a validar el stock actual contra Supabase antes de confirmar (evita sobreventa) */
async function revalidateCartStock() {
  const problemas = [];
  for (const item of Cart.items) {
    const stock = await ProductsAPI.getStockForTalla(item.producto_id, item.talla);
    if (stock <= 0) {
      problemas.push(`"${item.nombre}" (talla ${item.talla}) ya no está disponible.`);
    } else if (item.cantidad > stock) {
      problemas.push(
        `No hay suficiente stock disponible para esta talla: "${item.nombre}" talla ${item.talla} (disponible: ${stock}).`
      );
    }
  }
  return problemas;
}

// Arma el texto del pedido que se enviará por WhatsApp.
function buildWhatsAppMessage(cliente, pedido) {
  const labels = { qr: "QR", transferencia: "Transferencia bancaria", efectivo: "Efectivo contra entrega" };

  let msg = `Hola, quiero realizar un pedido en Couture Byte Market.\n\n`;
  msg += `Cliente: ${cliente.nombre}\n`;
  msg += `Teléfono: ${cliente.telefono}\n\n`;
  msg += `Pedido:\n`;
  Cart.items.forEach((i) => {
    msg += `• ${i.nombre} — Talla ${i.talla} — Cantidad: ${i.cantidad} — Bs. ${(i.precio * i.cantidad).toLocaleString("es-BO")}\n`;
  });
  msg += `\nTotal: Bs. ${Cart.getTotal().toLocaleString("es-BO")}\n`;
  if (SELECTED_PAYMENT_METHOD) {
    msg += `Método de pago: ${labels[SELECTED_PAYMENT_METHOD]}\n`;
    if (SELECTED_PAYMENT_METHOD !== "efectivo") {
      msg += `(Adjunto mi comprobante de pago en este chat)\n`;
    }
  }
  msg += `\nQuedo atento/a para confirmar mi pedido.`;
  return msg;
}

// Se ejecuta al confirmar la compra: valida, revisa el stock, registra el pedido y abre WhatsApp.
async function submitCheckout(e) {
  e.preventDefault();
  const datos = validateCheckoutForm();
  if (!datos) return;

  const btn = document.getElementById("confirmOrderBtn");
  btn.disabled = true;
  btn.textContent = "Verificando disponibilidad...";

  // 1) Revalidar stock antes de registrar (evita comprar agotados / sobreventa)
  const problemas = await revalidateCartStock();
  if (problemas.length > 0) {
    btn.disabled = false;
    btn.textContent = "Confirmar y continuar a WhatsApp";
    showToast(problemas[0], "error");
    return;
  }

  btn.textContent = "Registrando tu pedido...";

  // 2) Registrar cliente + pedido + detalle + descuento de stock (todo en una sola transacción vía RPC)
  const items = Cart.items.map((i) => ({
    producto_id: i.producto_id,
    nombre_producto: i.nombre,
    talla: i.talla,
    cantidad: i.cantidad,
    precio_unitario: i.precio,
  }));

  try {
    const { data, error } = await sb.rpc("crear_pedido", {
      p_nombre: datos.nombre,
      p_telefono: datos.telefono,
      p_correo: datos.email,
      p_items: items,
    });

    if (error) {
      console.error(error);
      const mensaje = error.message || "";
      if (mensaje.includes("STOCK_INSUFICIENTE")) {
        showToast("No hay suficiente stock disponible para esta talla.", "error");
      } else if (mensaje.includes("PRODUCTO_NO_ENCONTRADO")) {
        showToast("Uno de los productos ya no está disponible.", "error");
      } else {
        showToast("No se pudo registrar tu pedido. Intenta nuevamente.", "error");
      }
      btn.disabled = false;
      btn.textContent = "Confirmar y continuar a WhatsApp";
      return;
    }

    // 3) Generar mensaje de WhatsApp con datos reales del pedido y abrirlo
    const mensaje = buildWhatsAppMessage(datos, data);
    const url = `https://wa.me/${APP_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;

    showToast("¡Pedido registrado! Te llevamos a WhatsApp...", "success");

    // 4) Limpiar carrito y refrescar productos (stock actualizado) antes de salir
    Cart.clear();
    Cart.render();
    closeModal("checkoutModal");
    document.getElementById("checkoutForm").reset();

    setTimeout(() => window.open(url, "_blank"), 500);

    initProducts(); // refresca stock visible en pantalla
  } catch (err) {
    console.error(err);
    showToast("Ocurrió un error al procesar tu pedido.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Confirmar y continuar a WhatsApp";
  }
}
