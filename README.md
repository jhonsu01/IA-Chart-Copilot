# IA Chart Copilot — Panel de Administración

Aplicación de escritorio para **Windows** (construida con [Tauri](https://tauri.app/)) que permite gestionar las licencias de IA Chart Copilot: ver quién ha pagado, y **aprobar o rechazar pagos manuales**.

> Este repositorio contiene **solo** el panel de administración. La extensión de Chrome y el backend son privados.

---

## 📥 Descargar (usuarios finales)

Ve a la sección **[Releases](../../releases)** y descarga el instalador más reciente:

- **`IA.Chart.Copilot.Admin_x.x.x_x64_es-ES.msi`** — instalador recomendado.
- `.exe` (NSIS) — alternativa.

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
- Aprobar / rechazar **pagos manuales** (activa la licencia al aprobar).
- Ver el origen de activación y el último pago de cada licencia.

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

El instalador se compila en la nube (GitHub Actions) y se publica en Releases automáticamente al crear un tag:

```bash
# 1. Sube la versión en src-tauri/tauri.conf.json y package.json (ej: 1.0.1)
# 2. Crea y publica el tag:
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions (`.github/workflows/release.yml`) compilará el `.msi` y el `.exe` y creará el Release. En unos minutos estarán disponibles en la pestaña **Releases** para descargar.
