# 🎀 Couture Byte Market — Tienda de ropa online (versión Supabase)

Tienda de moda femenina completa: catálogo con imágenes ya cargadas, carrito,
control de tallas y stock real, checkout con datos del cliente, pedido
automático por WhatsApp, y panel de administrador con subida directa de
fotografías (sin URLs). Todo conectado a **Supabase** (base de datos +
autenticación + almacenamiento de imágenes).

No necesitas saber programar para configurarla: solo sigue los pasos de
este documento en orden.

---

## ✨ Funciones agregadas para vender mejor

- **Favoritos (♡)**: cada clienta puede guardar productos sin necesidad de
  cuenta (se guarda en su navegador). Ícono de corazón en el header con
  contador, y panel para verlos todos.
- **Guía de tallas**: enlace "¿Qué talla soy?" en cada producto, con tabla
  de medidas de referencia. Edítala en `index.html` (sección "MODAL: GUÍA
  DE TALLAS") si quieres poner las medidas reales de tus prendas.
- **Aviso de últimas unidades**: cuando quedan 3 unidades o menos de una
  talla, se resalta con un punto y el mensaje "¡Últimas X unidades!".
- **Compartir producto**: botón de compartir en la ficha de cada producto.
  Genera un enlace directo a esa prenda (con QR y opción de enviar por
  WhatsApp) para que la clienta se lo mande a una amiga.
- **Compartir tienda (QR)**: botón en el pie de página que muestra un
  código QR de tu tienda — útil para tarjetas de presentación o flyers
  impresos.
- **Información de envío en el checkout**: se muestra automáticamente
  antes de confirmar el pedido.
- **Métodos de pago (QR, transferencia, efectivo)**: el checkout muestra
  al instante los métodos que actives — incluyendo la foto real de tu QR
  para que la clienta pueda escanearlo y pagar ahí mismo.
- **Panel de "Configuración" en el admin** (nuevo): agrega o cambia tu QR
  de pago (subiendo la foto directamente, sin URLs ni código), los datos
  de transferencia bancaria, si aceptas efectivo, y el texto de envío —
  todo desde una pantalla, con guardado al instante.
- **Alerta de stock bajo en el admin**: una tarjeta más en "Productos" que
  cuenta cuántas prendas tienen 5 unidades o menos en total, para que
  sepas cuándo reponer.
- **Logo con monograma propio**: se reemplazó el texto simple "CB" por un
  distintivo con un pequeño detalle floral, a juego con los colores de la
  marca.
- **Panel de Estadísticas** (nuevo, primera pantalla del admin): gráficos
  reales calculados con tus pedidos — ventas por día, ventas por
  categoría, y productos más vendidos. Cambia el rango (7/30/90 días) con
  el selector de arriba.
- **Métodos de pago con pestañas**: en el checkout, la clienta elige cómo
  quiere pagar (QR / Transferencia / Efectivo) tocando una pestaña, y solo
  ve la información de esa opción. Al confirmar, el mensaje de WhatsApp
  incluye el método elegido y, si no es efectivo, un recordatorio de
  enviar el comprobante por el mismo chat.
- **Sección "Sobre nosotros"**: un breve texto de marca antes de los
  íconos de confianza, para darle más personalidad a la página. Edítalo
  en `index.html` (sección "NUESTRA HISTORIA + VALORES").

Todo funciona igual de simple que antes tanto para tus clientas como para
vos en el panel — no se agregó ningún paso extra obligatorio.

### Cómo activar tu QR de pago real

1. Entra al Panel de Administrador → **Configuración**.
2. En "Pago con QR", sube la foto de tu QR bancario (el mismo que usas
   para recibir transferencias — la mayoría de bancos en Bolivia lo llaman
   "QR Simple" dentro de su app).
3. Completa el banco y a nombre de quién está, activa el interruptor y
   presiona "Guardar configuración".
4. Listo — aparecerá automáticamente en el checkout de tu tienda, visible
   y lista para escanear.

## 📁 Estructura del proyecto

```
couture-bite/
├── index.html              → Tienda (lo que ve la clienta)
├── admin.html               → Panel de administrador
├── css/
│   ├── style.css            → Estilos de la tienda
│   └── admin.css             → Estilos del panel admin
├── js/
│   ├── config.js             → ⚠️ AQUÍ EDITAS TUS CLAVES DE SUPABASE
│   ├── supabaseClient.js     → Conexión con Supabase
│   ├── utils.js              → Funciones de ayuda (moneda, notificaciones...)
│   ├── products.js           → Catálogo, filtros, buscador
│   ├── cart.js                → Carrito de compras
│   ├── checkout.js            → Datos del cliente + registro de pedido + WhatsApp
│   ├── main.js                 → Inicialización de la tienda
│   └── admin/
│       ├── auth.js             → Inicio de sesión del administrador
│       ├── products.js          → Agregar/editar/eliminar productos + subir fotos
│       ├── orders.js             → Ver pedidos
│       ├── customers.js           → Ver clientes
│       └── main.js                 → Inicialización del panel
└── sql/
    ├── 01_schema.sql          → Crea las tablas
    ├── 02_funcion_pedidos.sql  → Función que registra pedidos de forma segura
    ├── 03_seguridad_rls.sql     → Políticas de seguridad + bucket de imágenes
    └── 04_datos_ejemplo.sql      → 16 productos de muestra con fotos ya cargadas
└── fotos-productos/
    ├── GUIA_FOTOS_REALES.md     → Cómo subir tus 16 fotos reales (2 min)
    └── (16 fotografías .jpg)     → Tus fotos reales, rescatadas de tu proyecto anterior
```

---

## 🔄 Qué cambió respecto a tu proyecto anterior

- **Antes**: catálogo fijo escrito directamente en `script.js` (sin base de
  datos real), sin control de tallas ni stock, y el formulario de pedido
  solo dejaba los datos en la consola del navegador con una nota de "esto
  se conectará a PHP/MySQL más adelante".
- **Ahora**: todo vive en **Supabase** (Postgres real). Hay stock
  independiente por talla, un panel de administrador completo, subida de
  fotos sin URLs, y el pedido se registra de verdad en la base de datos
  antes de abrir WhatsApp con el mensaje ya armado — nada de PHP ni MySQL.
- **Tus fotos reales**: encontré las 16 fotografías de productos que ya
  tenías (`img/` en tu proyecto anterior) y las dejé listas en
  `fotos-productos/`, con nombres de archivo limpios y una guía con
  nombre comercial, categoría y precio sugerido para cada una — así no
  empiezas con fotos genéricas de internet. Instrucciones abajo.

---

## 🚀 Paso 1 — Crear tu proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta (es gratis).
2. Haz clic en **"New Project"**.
3. Ponle un nombre (ej. `couture-bite`), crea una contraseña de base de datos
   (guárdala en un lugar seguro) y elige una región cercana a Bolivia
   (por ejemplo, São Paulo).
4. Espera 1-2 minutos a que el proyecto termine de crearse.

---

## 🗄️ Paso 2 — Crear las tablas (base de datos)

1. En el menú izquierdo de Supabase, entra a **SQL Editor**.
2. Haz clic en **"New query"**.
3. Abre el archivo `sql/01_schema.sql` de este proyecto, copia todo su
   contenido, pégalo en el editor y presiona **Run**.
4. Repite el mismo proceso, EN ESTE ORDEN, con:
   - `sql/02_funcion_pedidos.sql`
   - `sql/03_seguridad_rls.sql` *(este paso también crea automáticamente
     el bucket de imágenes "productos-imagenes" — no necesitas crearlo a mano)*
   - `sql/04_datos_ejemplo.sql` *(opcional: agrega 16 productos de muestra
     con fotos ya funcionando, para que veas la tienda completa de inmediato)*

> Si en algún momento ejecutaste antes `05_categoria_uniformes_medicos.sql`
> (una categoría de ejemplo que ya no viene en este proyecto) y quieres
> quitarla de tu Supabase, corre `sql/05_quitar_categoria_uniformes_medicos_OPCIONAL.sql`.

**Además, ejecuta `sql/06_configuracion.sql`** — crea la tabla que guarda
la información de envío y los métodos de pago, editable desde el Panel de
Administrador → "Configuración" (sin tocar código).
> Si nunca la agregaste, ignora este archivo.

**Y ejecuta también `sql/07_resenas_y_notas.sql`** — crea la tabla de
reseñas (con su seguridad: cualquiera puede escribir una, pero solo se
ve en la tienda cuando la apruebas desde el panel, en la pestaña
"Reseñas"). Sin este script, la sección de reseñas del producto y esa
pestaña del panel no van a funcionar.

**Y por último `sql/08_notificacion_pedidos.sql`** — crea la tabla que
recuerda hasta cuándo ya revisaste los pedidos, para mostrar el
numerito de "pedidos nuevos" en el menú del panel (desaparece solo al
entrar a la pestaña "Pedidos", y queda igual sin importar desde qué
computadora o celular entres). Sin este script, esa pestaña sigue
funcionando normal, solo que no vas a ver el aviso.

**Y ejecuta también `sql/09_actualizar_estado_pedido.sql`** — crea la
función que el panel usa para cambiar el estado de un pedido. Es la
que hace que, al cancelar un pedido, el stock de esas tallas vuelva
automáticamente (y que, si lo reactivas, se vuelva a descontar, o la
función avise si ya no hay stock suficiente). **Sin este script el
botón de cambiar estado del panel deja de funcionar**, así que no es
opcional.

**Y ejecuta `sql/10_portada.sql`** — agrega la columna para la foto de
portada. Con esto puedes cambiarla desde Panel → Configuración → "Foto de
portada". Si no lo ejecutas, la tienda sigue funcionando con la foto por defecto.

Con esto ya tienes: tablas de categorías, productos, tallas/stock, clientes,
pedidos y detalle de pedidos, más la función que registra un pedido completo
de forma seguraa (sin permitir comprar más stock del disponible).

---

## 🔑 Paso 3 — Conectar tus claves de Supabase

1. En Supabase, ve a **Project Settings → API**.
2. Copia el valor de **Project URL**.
3. Copia el valor de **anon public** (la clave pública, NO la "service_role").
4. Abre el archivo `js/config.js` de este proyecto y reemplaza:

```js
SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
SUPABASE_ANON_KEY: "TU-ANON-KEY-AQUI",
```

con tus valores reales. Guarda el archivo.

---

## 👤 Paso 4 — Crear tu usuario administrador

El panel de administrador usa Supabase Auth (correo + contraseña). Debes
crear el usuario manualmente una sola vez:

1. En Supabase, ve a **Authentication → Users**.
2. Haz clic en **"Add user" → "Create new user"**.
3. Escribe tu correo (ej. `admin@couturebite.com`) y una contraseña segura.
4. Marca la opción de **"Auto Confirm User"** si aparece, para no tener que
   verificar el correo.
5. Guarda. Ese correo y contraseña son con los que entrarás en
   `admin.html`.

> Puedes crear más de un usuario si varias personas van a administrar la
> tienda.

---

## 💻 Paso 5 — Abrir la tienda

Como el proyecto es HTML/CSS/JS puro (sin instalaciones), puedes:

**Opción A — Ver rápido en tu computadora:**
Haz doble clic en `index.html` (algunos navegadores restringen ciertas
funciones al abrir así; si algo no carga, usa la Opción B).

**Opción B — Servidor local simple** (recomendado):
Si tienes Python instalado, abre una terminal en la carpeta del proyecto y
ejecuta:
```
python3 -m http.server 8000
```
Luego abre `http://localhost:8000` en tu navegador.

**Opción C — Publicarla en internet (recomendado para el negocio real):**
Sube la carpeta completa a un servicio gratuito como **Netlify**,
**Vercel** o **GitHub Pages** (arrastra la carpeta a Netlify y listo, no
requiere configuración adicional).

---

## 🛍️ Cómo funciona la tienda (resumen)

1. La clienta entra, navega y busca productos libremente — sin necesidad de
   crear una cuenta.
2. Elige un producto, selecciona talla y cantidad (las tallas sin stock
   aparecen como **"Agotada"** y no se pueden elegir).
3. Agrega al carrito, revisa cantidades y precios.
4. Al presionar **"Finalizar pedido por WhatsApp"**, se le pide: nombre
   completo, teléfono y correo.
5. El sistema **vuelve a verificar el stock en tiempo real** (por si alguien
   más compró justo antes) y luego registra todo en Supabase en un solo paso
   seguro: cliente, pedido, detalle del pedido y descuento del stock.
6. Se abre WhatsApp automáticamente con el mensaje del pedido ya escrito,
   listo para enviar.

---

## 🛠️ Cómo usar el Panel de Administrador

1. Entra a `admin.html` (o haz clic en el botón **"Administrador"** del
   menú de la tienda).
2. Inicia sesión con el correo y contraseña que creaste en el Paso 4.

**Agregar una categoría nueva (sin tocar SQL):**
- Dentro de "Agregar producto" o "Editar producto", junto al selector de
  categoría hay un botón **"+ Categoría"**.
- Escribe el nombre (ej. "Accesorios", "Calzado") y presiona **"Crear
  categoría"**. Aparece al instante en el selector y también como filtro
  nuevo en la tienda — no hace falta editar ningún archivo ni ejecutar SQL.

**Agregar un producto:**
- Clic en **"Agregar producto"**.
- Toca la zona de **"Toca aquí para seleccionar una foto"** y elige una
  imagen desde tu computadora o celular (no necesitas ningún enlace ni URL).
  > 💡 Si quieres usar tus fotos reales ya listas, revisa
  > `fotos-productos/GUIA_FOTOS_REALES.md` — tiene el nombre comercial y
  > categoría sugeridos para cada una de tus 16 fotos.
- Completa nombre, descripción, precio y categoría.
- En **"Stock disponible por talla"**, escribe cuántas unidades hay de cada
  talla (XS, S, M, L, XL). Si dejas una talla en 0, aparecerá como agotada
  automáticamente en la tienda.
- Guarda.

**Editar o reemplazar la foto de un producto:**
- Clic en el ícono de lápiz de ese producto.
- Toca la vista previa de la imagen o la zona de subida para elegir una
  foto nueva; se reemplaza automáticamente al guardar.

**Eliminar un producto:** clic en el ícono de basurero y confirma. Si el
producto ya tiene pedidos registrados, el sistema no lo deja eliminar (para
no perder ese historial de ventas) y te ofrece **desactivarlo** en su
lugar: desaparece de la tienda al instante, pero sus datos y pedidos
pasados se conservan.

**Ver pedidos:** pestaña "Pedidos" — muestra fecha, cliente, teléfono,
productos y total de cada pedido. Puedes hacer clic en un pedido para ver
el detalle completo y cambiar su estado (pendiente / confirmado / enviado /
cancelado).

**Ver clientes:** pestaña "Clientes" — se llena automáticamente cada vez
que alguien completa un pedido.

---

## ✏️ Cómo cambiar los datos de contacto

Todo se edita en un único lugar: `js/config.js`

**Cambiar el número de WhatsApp:**
```js
WHATSAPP_NUMBER: "59178411020",
```
Reemplaza por el nuevo número (código de país + número, sin espacios ni "+").

**Cambiar Instagram y Facebook:**
```js
INSTAGRAM_URL: "https://instagram.com/couturebite",
FACEBOOK_URL: "https://facebook.com/couturebite",
```

**Cambiar la dirección / ubicación:**
Edita `DIRECCION` en `js/config.js`, y también el texto de la dirección
dentro de `index.html` (sección "Ubicación", cerca del `<iframe>` del mapa)
y el enlace del mapa si cambias de ciudad.

---

## 🔒 Seguridad (ya configurada)

- Cualquier visitante puede **ver** productos, categorías y stock — no
  necesita cuenta.
- Nadie puede modificar productos, tallas, precios ni imágenes desde
  afuera: solo un administrador con sesión iniciada (`auth.role() =
  'authenticated'` en las políticas RLS).
- Los pedidos y clientes se crean **únicamente** a través de la función
  `crear_pedido()`, que valida el stock disponible antes de registrar nada.
  Esto evita que alguien compre una talla agotada, compre más unidades de
  las disponibles, o que se generen pedidos duplicados o incompletos.
- Solo el administrador autenticado puede leer la lista de clientes y
  pedidos.

---

## ❓ Problemas comunes

- **"No se pudo cargar la librería de Supabase"** → revisa tu conexión a
  internet; el proyecto carga el cliente de Supabase desde un CDN.
- **Los productos no aparecen** → revisa que hayas puesto correctamente
  `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `js/config.js`, y que hayas
  ejecutado los 4 archivos SQL en orden.
- **No puedo subir imágenes desde el panel** → asegúrate de haber
  ejecutado `sql/03_seguridad_rls.sql` completo (crea el bucket
  "productos-imagenes" y sus permisos) y de haber iniciado sesión como
  administrador.
- **"Correo o contraseña incorrectos" en el panel admin** → confirma que
  creaste el usuario en Supabase → Authentication → Users, y que marcaste
  "Auto Confirm User".

---

Hecho con cariño para Couture Byte Market 🎀
