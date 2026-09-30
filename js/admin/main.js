/* =========================================================
   ADMIN — Inicialización del panel
   ========================================================= */

function switchAdminView(viewId) {
  document.querySelectorAll(".admin-view").forEach((v) => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
  document.querySelectorAll(".admin-nav-item[data-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });

  if (viewId === "viewPedidos") { loadOrdersTable(); marcarPedidosVistos(); }
  if (viewId === "viewClientes") loadCustomersTable();
  if (viewId === "viewResenas") loadResenasView();
  if (viewId === "viewConfig") loadConfigView();
  if (viewId === "viewStats") loadStatsView();
}

// Carga los datos iniciales del panel y conecta todos los botones.
async function initAdminPanel() {
  await AdminProducts.fetchCategorias();
  renderCategoriaOptions();
  await loadProductsTable();
  await loadStatsView();
  await refreshResenasBadge();
  await refreshPedidosBadge();

  document.getElementById("statsRangeSelect").addEventListener("change", loadStatsView);
  document.getElementById("exportVentasBtn").addEventListener("click", exportarVentasCsv);
  document.getElementById("exportStockBajoBtn").addEventListener("click", exportarStockBajoCsv);
  document.getElementById("exportVentasPdfBtn").addEventListener("click", exportarVentasPdf);
  document.getElementById("exportStockBajoPdfBtn").addEventListener("click", exportarStockBajoPdf);

  document.querySelectorAll(".admin-nav-item[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => switchAdminView(btn.dataset.view));
  });

  document.getElementById("openAddProductBtn").addEventListener("click", () => openProductForm(null));
  document.getElementById("productForm").addEventListener("submit", submitProductForm);
  document.getElementById("confirmDeleteBtn").addEventListener("click", confirmDeleteProduct);
  document.getElementById("confirmDeactivateBtn").addEventListener("click", confirmDeactivateProduct);
  document.getElementById("newCategoriaBtn").addEventListener("click", openNewCategoriaModal);
  document.getElementById("saveNewCategoriaBtn").addEventListener("click", saveNewCategoria);
  document.getElementById("newCategoriaNombre").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); saveNewCategoria(); }
  });

  document.getElementById("adminProductSearch").addEventListener(
    "input",
    debounce((e) => {
      ADMIN_PRODUCT_SEARCH = e.target.value;
      renderProductsGrid();
    }, 300)
  );

  setupImageUpload();
  setupConfigQrUpload();
  setupConfigPortadaUpload();
  setupLightbox();
  document.getElementById("saveConfigBtn").addEventListener("click", saveConfig);

  // Cerrar las ventanas emergentes al hacer clic fuera o con Escape
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.open").forEach((m) => closeModal(m.id));
    }
  });
}

// Al abrir el panel: primero se verifica la sesión y, solo si es válida, se inicia el panel.
document.addEventListener("DOMContentLoaded", async () => {
  const autenticado = await initAuthGate();
  if (autenticado) {
    initAdminPanel();
  }
});
