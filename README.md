# IA Chart Copilot — Panel de Administración

Aplicación para **Windows** y **Android** (construida con [Tauri](https://tauri.app/)) que permite gestionar las licencias de IA Chart Copilot: ver quién ha pagado, y **aprobar o rechazar pagos manuales**.

> Este repositorio contiene **solo** el panel de administración. La extensión de Chrome y el backend son privados.

---

## 📥 Descargar (usuarios finales)

Ve a la sección **[Releases](../../releases)** y descarga la versión que necesites:

**Windows**
- **`IA.Chart.Copilot.Admin_x.x.x_x64_es-ES.msi`** — instalador recomendado.
- `.exe` (NSIS) — alternativa.

**Android**
- **`app-arm64-release.apk`** — para teléfonos modernos (recomendado).
- `app-arm-release.apk` — teléfonos antiguos (armv7).
- `app-x86_64-release.apk` / `app-x86-release.apk` — emuladores.

> En Android hay que permitir la instalación desde **orígenes desconocidos**.
> Como cada versión se firma con una clave distinta, para actualizar hay que **desinstalar** la anterior.

Instálalo y ábrelo. La primera vez:

1. En la barra superior, escribe la **URL de tu API** (por defecto `https://ia-chart-copilot.vercel.app`).
2. Pega tu **Admin Token**.
3. Pulsa **Conectar**.

El token y la URL se guardan **solo en tu equipo** (no se envían a ningún tercero ni viajan en este repositorio).

---

## 🔐 Seguridad

- Esta app **no contiene secretos**. El `ADMIN_API_TOKEN` lo introduces tú al abrirla y queda guardado localmente en tu equipo.
- Solo se comunica con tu propia API (`/api/admin/*`) usando ese token como `Authorization: Bearer`.
- Por eso este repositorio puede ser público sin riesgo.

---

## 🧩 Funcionalidad

- Listado de licencias con buscador y filtro por estado (activas / pendientes / revocadas).
- Resumen con conteos.
- Aprobar / rechazar **pagos manuales** (activa la licencia al aprobar y envía la clave por correo).
- Ver el **comprobante** subido por el cliente.
- Configurar los **canales de pago** (Wompi / transferencia) y las **cuentas** para transferencia.
- **Auto-refresh** cada 30 s y **notificaciones** al llegar un comprobante nuevo o confirmarse un pago.
- Interfaz **responsive** (móvil y escritorio), respetando el notch en Android.

---

## 🛠️ Desarrollo local

Requisitos: [Node.js](https://nodejs.org/) 18+, [Rust](https://www.rust-lang.org/tools/install) y las [dependencias de Tauri para Windows](https://tauri.app/start/prerequisites/).

```bash
npm install
npx tauri icon app-icon.png   # genera los iconos (solo la 1a vez o si cambia el logo)
npm run dev                    # modo desarrollo
npm run build                  # compila el instalador en src-tauri/target/release/bundle/
```

---

## 🚀 Publicar una nueva versión (release automático)

Los instaladores se compilan en la nube (GitHub Actions) y se publican en Releases al crear un tag:

```bash
# 1. Sube la versión en los TRES archivos:
#    src-tauri/tauri.conf.json, package.json y src-tauri/Cargo.toml
# 2. Crea y publica el tag:
git tag v1.0.7
git push origin v1.0.7
```

Dos workflows publican en el mismo Release:
- `.github/workflows/release.yml` → `.msi` y `.exe` (Windows)
- `.github/workflows/android.yml` → `.apk` firmados por arquitectura (Android)

### 🧹 Política de releases

**Se mantiene únicamente el release más reciente.** Al publicar una versión nueva, se eliminan los releases y tags anteriores para mantener el repositorio ordenado:

```bash
gh release delete vX.Y.Z --repo jhonsu01/IA-Chart-Copilot --cleanup-tag --yes
```
