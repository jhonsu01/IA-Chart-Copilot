"use strict";

// Panel admin: consume la API de licencias con el Admin Token.
// El token y la API base se guardan en localStorage (local a la app Tauri).

const $ = (id) => document.getElementById(id);
let CONFIG = { apiBase: "", token: "" };
let allLicenses = [];

document.addEventListener("DOMContentLoaded", () => {
  // Cargar config guardada
  CONFIG.apiBase = localStorage.getItem("apiBase") || "https://ia-chart-copilot.vercel.app";
  CONFIG.token = localStorage.getItem("adminToken") || "";
  $("apiBase").value = CONFIG.apiBase;
  $("adminToken").value = CONFIG.token;

  $("btnConnect").addEventListener("click", connect);
  $("btnRefresh").addEventListener("click", loadLicenses);
  $("search").addEventListener("input", render);
  $("filterStatus").addEventListener("change", render);

  if (CONFIG.token) loadLicenses();
});

function connect() {
  CONFIG.apiBase = $("apiBase").value.trim().replace(/\/+$/, "");
  CONFIG.token = $("adminToken").value.trim();
  localStorage.setItem("apiBase", CONFIG.apiBase);
  localStorage.setItem("adminToken", CONFIG.token);
  loadLicenses();
}

function setMsg(text, type) {
  $("msg").innerHTML = text ? `<div class="msg ${type || ""}">${text}</div>` : "";
}

async function api(path, options = {}) {
  const resp = await fetch(`${CONFIG.apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CONFIG.token}`,
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`${resp.status}: ${txt.slice(0, 120)}`);
  }
  return resp.json();
}

async function loadLicenses() {
  setMsg("Cargando...", "");
  $("connStatus").textContent = "Conectando...";
  try {
    const data = await api("/api/admin/licenses");
    allLicenses = data.licenses || [];
    renderSummary(data.summary);
    render();
    $("connStatus").textContent = "✓ Conectado";
    setMsg("", "");
  } catch (e) {
    $("connStatus").textContent = "✗ Error";
    setMsg("Error: " + e.message + " — verifica API base y token.", "error");
    $("rows").innerHTML = `<tr><td colspan="6" class="empty">No se pudo cargar. Revisa la configuración.</td></tr>`;
  }
}

function renderSummary(s) {
  if (!s) { $("summary").innerHTML = ""; return; }
  $("summary").innerHTML = `
    <div class="stat active"><div class="num">${s.active || 0}</div><div class="lbl">Activas</div></div>
    <div class="stat pending"><div class="num">${s.pending || 0}</div><div class="lbl">Pendientes</div></div>
    <div class="stat"><div class="num">${s.revoked || 0}</div><div class="lbl">Revocadas</div></div>
    <div class="stat"><div class="num">${s.total || 0}</div><div class="lbl">Total</div></div>
  `;
}

function render() {
  const q = $("search").value.trim().toLowerCase();
  const statusFilter = $("filterStatus").value;
  const filtered = allLicenses.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (q && !l.email.toLowerCase().includes(q) && !(l.name || "").toLowerCase().includes(q)) return false;
    return true;
  });

  if (filtered.length === 0) {
    $("rows").innerHTML = `<tr><td colspan="6" class="empty">Sin resultados.</td></tr>`;
    return;
  }

  $("rows").innerHTML = filtered.map((l) => {
    const lastPay = (l.payments && l.payments[0]) || null;
    const payInfo = lastPay
      ? `<span class="method">${lastPay.method} · ${lastPay.status}${lastPay.approved_by ? " · " + lastPay.approved_by : ""}</span>`
      : `<span class="method">—</span>`;
    const actions = l.status === "pending"
      ? `<button class="approve" data-email="${esc(l.email)}" data-action="approve">✓ Aprobar</button>
         <button class="reject" data-email="${esc(l.email)}" data-action="reject">✕ Rechazar</button>`
      : `<span class="method">—</span>`;
    return `<tr>
      <td>${esc(l.email)}</td>
      <td>${esc(l.name || "")}</td>
      <td><span class="badge ${l.status}">${l.status}</span></td>
      <td class="method">${l.activation_source || "—"}</td>
      <td>${payInfo}</td>
      <td>${actions}</td>
    </tr>`;
  }).join("");

  document.querySelectorAll("#rows button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => onAction(btn.dataset.email, btn.dataset.action));
  });
}

async function onAction(email, action) {
  const label = action === "approve" ? "APROBAR" : "RECHAZAR";
  if (!confirm(`¿${label} el pago manual de ${email}?`)) return;

  setMsg(`Procesando ${email}...`, "");
  try {
    await api("/api/admin/approve", {
      method: "POST",
      body: JSON.stringify({ email, action, adminEmail: "admin-desktop" }),
    });
    setMsg(`✓ ${email}: pago ${action === "approve" ? "aprobado, licencia activada" : "rechazado"}.`, "success");
    await loadLicenses();
  } catch (e) {
    setMsg("Error: " + e.message, "error");
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}
