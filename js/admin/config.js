/* =========================================================
   ADMIN — Configuración de la tienda
   Envío y métodos de pago, editables sin tocar código.
   Se guardan en la tabla "configuracion" de Supabase (fila única).
   ========================================================= */

let CONFIG_QR_UPLOADED_URL = null;
let CONFIG_PORTADA_URL = null;          // URL de la portada elegida (null = usar la foto por defecto)
let CONFIG_PORTADA_TIENE_COLUMNA = false; // false si todavía no se ejecutó sql/10_portada.sql

// Lee y guarda la configuración de la tienda (envío y métodos de pago).
const AdminConfig = {
  // Trae la única fila de configuración (id = 1).
  async fetch() {
    const { data, error } = await sb.from("configuracion").select("*").eq("id", 1).single();
    if (error) {
      console.error(error);
      return null;
    }
    return data;
  },

  // Guarda los cambios en esa fila de configuración.
  async save(payload) {
    const { error } = await sb.from("configuracion").update(payload).eq("id", 1);
    if (error) throw error;
  },

  // Sube la foto de portada a Supabase Storage.
  async uploadPortada(file) {
    const ext = file.name.split(".").pop();
    const fileName = `portada_${Date.now()}.${ext}`;
    const { error } = await sb.storage
      .from(APP_CONFIG.STORAGE_BUCKET)
      .upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = sb.storage.from(APP_CONFIG.STORAGE_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  },

  // Sube la imagen del QR de pago a Supabase Storage.
  async uploadQrImage(file) {
    const ext = file.name.split(".").pop();
    const fileName = `qr_pago_${Date.now()}.${ext}`;
    const { error } = await sb.storage
      .from(APP_CONFIG.STORAGE_BUCKET)
      .upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = sb.storage.from(APP_CONFIG.STORAGE_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  },
};

// Rellena el formulario con la configuración guardada.
async function loadConfigView() {
  const cfg = await AdminConfig.fetch();
  if (!cfg) {
    showToast("No se pudo cargar la configuración. Revisa que hayas ejecutado sql/06_configuracion.sql", "error");
    return;
  }

  document.getElementById("cfgEnvioInfo").value = cfg.envio_info || "";

  CONFIG_PORTADA_TIENE_COLUMNA = "portada_url" in cfg;
  CONFIG_PORTADA_URL = cfg.portada_url || null;
  renderPortadaPreview();

  document.getElementById("cfgQrActivo").checked = !!cfg.qr_activo;
  document.getElementById("cfgQrBanco").value = cfg.qr_banco || "";
  document.getElementById("cfgQrTitular").value = cfg.qr_titular || "";
  CONFIG_QR_UPLOADED_URL = cfg.qr_imagen_url || null;
  if (cfg.qr_imagen_url) {
    document.getElementById("cfgQrPreviewImg").src = cfg.qr_imagen_url;
    document.getElementById("cfgQrPreviewWrap").style.display = "block";
  }

  document.getElementById("cfgTransferenciaActivo").checked = !!cfg.transferencia_activo;
  document.getElementById("cfgTransferenciaBanco").value = cfg.transferencia_banco || "";
  document.getElementById("cfgTransferenciaCuenta").value = cfg.transferencia_cuenta || "";
  document.getElementById("cfgTransferenciaTitular").value = cfg.transferencia_titular || "";

  document.getElementById("cfgEfectivoActivo").checked = cfg.efectivo_activo !== false;
}

// Muestra (u oculta) la vista previa de la portada y el botón de "volver a la de por defecto".
function renderPortadaPreview() {
  const wrap = document.getElementById("cfgPortadaPreviewWrap");
  const img = document.getElementById("cfgPortadaPreviewImg");
  const quitar = document.getElementById("cfgPortadaQuitarBtn");
  if (CONFIG_PORTADA_URL) {
    img.src = CONFIG_PORTADA_URL;
    wrap.style.display = "block";
    quitar.style.display = "inline-flex";
  } else {
    wrap.style.display = "none";
    quitar.style.display = "none";
  }
}

// Conecta la zona de subida de la foto de portada.
function setupConfigPortadaUpload() {
  const input = document.getElementById("cfgPortadaInput");
  const zone = document.getElementById("cfgPortadaUploadZone");

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (file) await handlePortadaFile(file);
    input.value = "";
  });
  ["dragover", "dragleave", "drop"].forEach((evt) => zone.addEventListener(evt, (e) => e.preventDefault()));
  zone.addEventListener("dragover", () => zone.classList.add("dragover"));
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", async (e) => {
    zone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) await handlePortadaFile(file);
  });

  document.getElementById("cfgPortadaQuitarBtn").addEventListener("click", async () => {
    if (!CONFIG_PORTADA_TIENE_COLUMNA) return;
    try {
      await AdminConfig.save({ portada_url: null });
      CONFIG_PORTADA_URL = null;
      renderPortadaPreview();
      showToast("Se volvió a la foto de portada por defecto.", "success");
    } catch (err) {
      console.error(err);
      showToast("No se pudo restablecer la portada.", "error");
    }
  });
}

// Valida, sube y GUARDA la portada al instante (no hace falta "Guardar configuración").
async function handlePortadaFile(file) {
  if (!CONFIG_PORTADA_TIENE_COLUMNA) {
    showToast("Primero ejecuta sql/10_portada.sql en Supabase (SQL Editor).", "error");
    return;
  }
  if (!file.type.startsWith("image/")) {
    showToast("Por favor selecciona un archivo de imagen (JPG, PNG o WEBP).", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("La imagen es muy pesada. Usa una de máximo 5MB.", "error");
    return;
  }

  const progress = document.getElementById("cfgPortadaUploadProgress");
  const bar = document.getElementById("cfgPortadaUploadProgressBar");
  progress.style.display = "block";
  bar.style.width = "40%";
  try {
    const url = await AdminConfig.uploadPortada(file);
    await AdminConfig.save({ portada_url: url });
    bar.style.width = "100%";
    CONFIG_PORTADA_URL = url;
    renderPortadaPreview();
    showToast("Portada actualizada. Ya se ve en la tienda.", "success");
  } catch (err) {
    console.error(err);
    showToast("No se pudo subir la portada. Revisa la configuración de Supabase Storage.", "error");
  } finally {
    setTimeout(() => (progress.style.display = "none"), 600);
  }
}

// Conecta la zona de subida de la imagen del QR de pago.
function setupConfigQrUpload() {
  const input = document.getElementById("cfgQrImageInput");
  const zone = document.getElementById("cfgQrUploadZone");

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (file) await handleConfigQrFile(file);
  });

  ["dragover", "dragleave", "drop"].forEach((evt) => {
    zone.addEventListener(evt, (e) => e.preventDefault());
  });
  zone.addEventListener("dragover", () => zone.classList.add("dragover"));
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", async (e) => {
    zone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) await handleConfigQrFile(file);
  });
}

// Valida el archivo (que sea imagen y pese máximo 5 MB) y lo sube.
async function handleConfigQrFile(file) {
  if (!file.type.startsWith("image/")) {
    showToast("Por favor selecciona un archivo de imagen (JPG, PNG o WEBP).", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("La imagen es muy pesada. Usa una de máximo 5MB.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("cfgQrPreviewImg").src = e.target.result;
    document.getElementById("cfgQrPreviewWrap").style.display = "block";
  };
  reader.readAsDataURL(file);

  const progress = document.getElementById("cfgQrUploadProgress");
  const bar = document.getElementById("cfgQrUploadProgressBar");
  progress.style.display = "block";
  bar.style.width = "40%";

  try {
    const url = await AdminConfig.uploadQrImage(file);
    bar.style.width = "100%";
    CONFIG_QR_UPLOADED_URL = url;
    document.getElementById("cfgQrPreviewImg").src = url;
    showToast("Imagen de QR subida correctamente.", "success");
    setTimeout(() => (progress.style.display = "none"), 600);
  } catch (err) {
    console.error(err);
    showToast("No se pudo subir la imagen. Revisa la configuración de Supabase Storage.", "error");
    progress.style.display = "none";
  }
}

// Lee el formulario y guarda la configuración en Supabase.
async function saveConfig() {
  const btn = document.getElementById("saveConfigBtn");
  btn.disabled = true;
  btn.textContent = "Guardando...";

  const qrActivo = document.getElementById("cfgQrActivo").checked;
  if (qrActivo && !CONFIG_QR_UPLOADED_URL) {
    showToast("Activa el QR solo después de subir la imagen.", "error");
    btn.disabled = false;
    btn.textContent = "Guardar configuración";
    return;
  }

  const payload = {
    envio_info: document.getElementById("cfgEnvioInfo").value.trim(),
    qr_activo: qrActivo,
    qr_imagen_url: CONFIG_QR_UPLOADED_URL,
    qr_banco: document.getElementById("cfgQrBanco").value.trim(),
    qr_titular: document.getElementById("cfgQrTitular").value.trim(),
    transferencia_activo: document.getElementById("cfgTransferenciaActivo").checked,
    transferencia_banco: document.getElementById("cfgTransferenciaBanco").value.trim(),
    transferencia_cuenta: document.getElementById("cfgTransferenciaCuenta").value.trim(),
    transferencia_titular: document.getElementById("cfgTransferenciaTitular").value.trim(),
    efectivo_activo: document.getElementById("cfgEfectivoActivo").checked,
  };

  try {
    await AdminConfig.save(payload);
    showToast("Configuración guardada.", "success");
  } catch (err) {
    console.error(err);
    showToast("No se pudo guardar la configuración.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar configuración";
  }
}
