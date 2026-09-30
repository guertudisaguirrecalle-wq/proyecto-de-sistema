/* =========================================================
   CARRITO DE COMPRAS
   Se guarda en localStorage para que no se pierda si la
   clienta recarga la página, pero no requiere registro.
   ========================================================= */

const CART_STORAGE_KEY = "couture_bite_cart";

const Cart = {
  items: [],

  // Lee el carrito guardado en el navegador (localStorage).
  load() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      this.items = raw ? JSON.parse(raw) : [];
    } catch {
      this.items = [];
    }
  },

  // Guarda el carrito en el navegador y actualiza el numerito del ícono.
  save() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
    this.updateCount();
  },

  /** Agrega un producto con talla y cantidad, respetando el stock disponible */
  addItem(producto, talla, cantidad, stockDisponible) {
    const existente = this.items.find(
      (i) => i.producto_id === producto.id && i.talla === talla
    );
    const cantidadActual = existente ? existente.cantidad : 0;
    const nuevaCantidad = cantidadActual + cantidad;

    if (nuevaCantidad > stockDisponible) {
      showToast(
        `Solo quedan ${stockDisponible} unidad(es) disponibles en talla ${talla}.`,
        "error"
      );
      return false;
    }

    if (existente) {
      existente.cantidad = nuevaCantidad;
    } else {
      this.items.push({
        producto_id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        talla,
        cantidad,
        imagen_url: producto.imagen_url,
        categoria: producto.categoria_nombre || "",
      });
    }
    this.save();
    showToast(`"${producto.nombre}" (talla ${talla}) agregado a tu bolsa.`, "success");
    return true;
  },

  // Quita un producto (con su talla) del carrito.
  removeItem(producto_id, talla) {
    this.items = this.items.filter(
      (i) => !(i.producto_id === producto_id && i.talla === talla)
    );
    this.save();
    this.render();
  },

  /** Cambia la cantidad de un ítem, validando contra el stock real */
  async changeQty(producto_id, talla, delta) {
    const item = this.items.find(
      (i) => i.producto_id === producto_id && i.talla === talla
    );
    if (!item) return;

    const nuevaCantidad = item.cantidad + delta;
    if (nuevaCantidad <= 0) {
      this.removeItem(producto_id, talla);
      return;
    }

    if (delta > 0) {
      const stock = await ProductsAPI.getStockForTalla(producto_id, talla);
      if (nuevaCantidad > stock) {
        showToast(`No hay suficiente stock disponible para esta talla.`, "error");
        return;
      }
    }

    item.cantidad = nuevaCantidad;
    this.save();
    this.render();
  },

  // Suma precio × cantidad de todo lo que hay en el carrito.
  getTotal() {
    return this.items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  },

  // Cuenta cuántas prendas hay en total en el carrito.
  getCount() {
    return this.items.reduce((sum, i) => sum + i.cantidad, 0);
  },

  // Vacía el carrito (se usa después de confirmar un pedido).
  clear() {
    this.items = [];
    this.save();
  },

  // Actualiza el número que aparece sobre el ícono de la bolsa.
  updateCount() {
    const el = document.getElementById("cartCount");
    if (!el) return;
    const newCount = this.getCount();
    const changed = el.textContent !== String(newCount);
    el.textContent = newCount;
    if (changed) {
      el.classList.remove("bump");
      void el.offsetWidth; // reinicia la animación aunque se dispare seguido
      el.classList.add("bump");
    }
  },

  // Dibuja en pantalla la lista de productos del carrito y el total.
  render() {
    const wrap = document.getElementById("cartItemsWrap");
    const footer = document.getElementById("cartFooter");
    if (!wrap) return;

    if (this.items.length === 0) {
      wrap.innerHTML = `
        <div class="cart-empty">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <h3 style="font-family:var(--font-display); font-size:18px; margin-bottom:6px; color:var(--text);">Tu bolsa está vacía</h3>
          <p>Descubre piezas hechas para ti y arma tu look.</p>
        </div>`;
      if (footer) footer.style.display = "none";
      document.getElementById("cartTotal").textContent = formatBs(0);
      return;
    }

    if (footer) footer.style.display = "block";

    wrap.innerHTML = this.items
      .map((item) => {
        const imgSrc = item.imagen_url || "";
        return `
        <div class="cart-item">
          <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(item.nombre)}" onerror="handleImgError(this,'${escapeHtml(item.categoria)}')">
          <div>
            <div class="cart-item-name">${escapeHtml(item.nombre)}</div>
            <div class="cart-item-meta">Talla ${escapeHtml(item.talla)}</div>
            <div class="qty-control">
              <button onclick="Cart.changeQty('${item.producto_id}','${item.talla}',-1)" aria-label="Disminuir cantidad">−</button>
              <span>${item.cantidad}</span>
              <button onclick="Cart.changeQty('${item.producto_id}','${item.talla}',1)" aria-label="Aumentar cantidad">+</button>
            </div>
          </div>
          <div class="cart-item-price">
            <b>${formatBs(item.precio * item.cantidad)}</b>
            <button class="remove-btn" onclick="Cart.removeItem('${item.producto_id}','${item.talla}')">Eliminar</button>
          </div>
        </div>`;
      })
      .join("");

    document.getElementById("cartTotal").textContent = formatBs(this.getTotal());
  },

  // Abre el panel lateral del carrito.
  open() {
    document.getElementById("cartDrawer").classList.add("open");
    document.getElementById("overlay").classList.add("open");
    document.body.style.overflow = "hidden";
    this.render();
  },

  // Cierra el panel lateral del carrito.
  close() {
    document.getElementById("cartDrawer").classList.remove("open");
    document.getElementById("overlay").classList.remove("open");
    document.body.style.overflow = "";
  },
};

// Apenas carga la página, se recupera el carrito guardado.
Cart.load();
