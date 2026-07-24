"use strict";

// Panel admin: consume la API de licencias con el Admin Token.
// El token y la API base se guardan en localStorage (local a la app).

const $ = (id) => document.getElementById(id);
let CONFIG = { apiBase: "", token: "" };
let allLicenses = [];
let accounts = []; // cuentas editables en la pestaña Configuración
let pollTimer = null;
const POLL_MS = 30000; // auto-refresh cada 30s
let seenEvents = new Set(JSON.parse(localStorage.getItem("seenEvents") || "[]"));
let firstLoadDone = false;

const ESTADO_ES = { active: "Activa", pending: "Pendiente", revoked: "Revocada" };
const PAGO_ES = { approved: "aprobado", pending: "pendiente", declined: "rechazado", error: "error" };

document.addEventListener("DOMContentLoaded", () => {
  CONFIG.apiBase = localStorage.getItem("apiBase") || "https://ia-chart-copilot.vercel.app";
  CONFIG.token = localStorage.getItem("adminToken") || "";
  $("apiBase").value = CONFIG.apiBase;
  $("adminToken").value = CONFIG.token;

  $("btnConnect").addEventListener("click", connect);
  $("btnRefresh").addEventListener("click", refreshCurrent);
  $("search").addEventListener("input", render);
  $("filterStatus").addEventListener("change", render);

  $("tabLicenses").addEventListener("click", () => switchView("licenses"));
  $("tabConfig").addEventListener("click", () => switchView("config"));

  $("btnAddAcct").addEventListener("click", () => { accounts.push({ label: "", value: "", hint: "" }); renderAccounts(); });
  $("btnSaveCfg").addEventListener("click", saveConfig);

  $("closeReceipt").addEventListener("click", closeReceipt);
  $("receiptModal").addEventListener("click", (e) => { if (e.target.id === "receiptModal") closeReceipt(); });
  $("notifBanner").addEventListener("click", () => { $("notifBanner").classList.remove("show"); switchView("licenses"); });

  if (CONFIG.token) { firstLoadDone = false; loadLicenses(); }
  requestNotifPermission();
  startPolling();
});

function connect() {
  CONFIG.apiBase = $("apiBase").value.trim().replace(/\/+$/, "");
  CONFIG.token = $("adminToken").value.trim();
  localStorage.setItem("apiBase", CONFIG.apiBase);
  localStorage.setItem("adminToken", CONFIG.token);
  firstLoadDone = false; // al reconectar, sembrar sin notificar
  requestNotifPermission();
  loadLicenses();
  loadConfig();
  startPolling();
}

function switchView(view) {
  $("tabLicenses").classList.toggle("active", view === "licenses");
  $("tabConfig").classList.toggle("active", view === "config");
  $("view-licenses").classList.toggle("hidden", view !== "licenses");
  $("view-config").classList.toggle("hidden", view !== "config");
  if (view === "config" && CONFIG.token) loadConfig();
}

function refreshCurrent() {
  if (!$("view-config").classList.contains("hidden")) loadConfig();
  else loadLicenses();
}

// Auto-refresh: sondea la lista periódicamente para detectar pagos/solicitudes nuevas.
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (CONFIG.token && !document.hidden) loadLicenses(true);
  }, POLL_MS);
}

function setMsg(text, type) {
  $("msg").innerHTML = text ? `<div class="msg ${type || ""}">${text}</div>` : "";
}

async function api(path, options = {}) {
  const resp = await fetch(`${CONFIG.apiBase}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CONFIG.token}`, ...(options.headers || {}) },
  });
  if (!resp.ok) { const txt = await resp.text(); throw new Error(`${resp.status}: ${txt.slice(0, 160)}`); }
  return resp.json();
}

// ============ LICENCIAS ============
async function loadLicenses(silent = false) {
  if (!silent) { setMsg("Cargando...", ""); $("connStatus").textContent = "Conectando..."; }
  try {
    const data = await api("/api/admin/licenses");
    allLicenses = data.licenses || [];
    renderSummary(data.summary);
    render();
    detectNewEvents();
    $("connStatus").textContent = "✓ Conectado";
    const now = new Date().toLocaleTimeString();
    $("autoInfo").textContent = `Actualizado ${now} · auto cada 30s`;
    if (!silent) setMsg("", "");
  } catch (e) {
    $("connStatus").textContent = "✗ Error";
    if (!silent) {
      setMsg("Error: " + e.message + " — verifica API base y token.", "error");
      $("rows").innerHTML = `<tr><td colspan="6" class="empty">No se pudo cargar. Revisa la configuración.</td></tr>`;
    }
  }
}

// Detecta comprobantes nuevos (a aprobar) y pagos aprobados nuevos -> notifica.
function detectNewEvents() {
  const events = [];
  for (const l of allLicenses) {
    for (const p of l.payments || []) {
      if (p.method === "manual" && p.has_receipt && p.status === "pending") {
        events.push({ key: `receipt:${p.id}:${p.receipt_at || ""}`, title: "🧾 Nuevo comprobante por revisar", body: `${l.email} envió su pago manual. Toca para aprobar.` });
      }
      if (p.status === "approved") {
        const via = p.method === "wompi" ? "por pasarela (Wompi)" : "manual";
        events.push({ key: `paid:${p.id}`, title: "💰 Pago confirmado", body: `${l.email} pagó ${via}.` });
      }
    }
  }
  if (!firstLoadDone) {
    // Primer barrido tras conectar: sembrar sin notificar (evita avalancha inicial).
    for (const ev of events) seenEvents.add(ev.key);
    persistSeen();
    firstLoadDone = true;
    return;
  }
  const nuevos = events.filter((ev) => !seenEvents.has(ev.key));
  for (const ev of nuevos) {
    seenEvents.add(ev.key);
    notify(ev.title, ev.body);
  }
  if (nuevos.length) persistSeen();
}

function persistSeen() {
  // Limitar el tamaño guardado.
  const arr = Array.from(seenEvents).slice(-500);
  seenEvents = new Set(arr);
  localStorage.setItem("seenEvents", JSON.stringify(arr));
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
    const hasReceipt = (l.payments || []).some((p) => p.method === "manual" && p.has_receipt);
    let payInfo = lastPay
      ? `<span class="method">${lastPay.method} · ${PAGO_ES[lastPay.status] || lastPay.status}${lastPay.approved_by ? " · " + lastPay.approved_by : ""}</span>`
      : `<span class="method">—</span>`;
    if (hasReceipt) payInfo += ` <button class="ghost sm" data-email="${esc(l.email)}" data-action="receipt">📎 Ver comprobante</button>`;
    const actions = l.status === "pending"
      ? `<button class="approve sm" data-email="${esc(l.email)}" data-action="approve">✓ Aprobar</button>
         <button class="reject sm" data-email="${esc(l.email)}" data-action="reject">✕ Rechazar</button>`
      : `<span class="method">—</span>`;
    return `<tr>
      <td data-label="Email">${esc(l.email)}</td>
      <td data-label="Nombre">${esc(l.name || "")}</td>
      <td data-label="Estado"><span class="badge ${l.status}">${ESTADO_ES[l.status] || l.status}</span></td>
      <td data-label="Origen" class="method">${l.activation_source || "—"}</td>
      <td data-label="Último pago">${payInfo}</td>
      <td data-label="Acciones" class="actions">${actions}</td>
    </tr>`;
  }).join("");

  document.querySelectorAll("#rows button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => onAction(btn.dataset.email, btn.dataset.action));
  });
}

async function onAction(email, action) {
  if (action === "receipt") return viewReceipt(email);
  const label = action === "approve" ? "APROBAR" : "RECHAZAR";
  if (!confirm(`¿${label} el pago manual de ${email}?`)) return;
  setMsg(`Procesando ${email}...`, "");
  try {
    await api("/api/admin/approve", { method: "POST", body: JSON.stringify({ email, action, adminEmail: "admin-desktop" }) });
    setMsg(`✓ ${email}: pago ${action === "approve" ? "aprobado, licencia activada" : "rechazado"}.`, "success");
    await loadLicenses();
  } catch (e) { setMsg("Error: " + e.message, "error"); }
}

// ============ COMPROBANTE ============
async function viewReceipt(email) {
  try {
    const resp = await fetch(`${CONFIG.apiBase}/api/admin/receipt?email=${encodeURIComponent(email)}`, { headers: { "Authorization": `Bearer ${CONFIG.token}` } });
    if (!resp.ok) { setMsg("No se pudo cargar el comprobante (" + resp.status + ")", "error"); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    $("receiptImg").src = url;
    $("receiptModal").classList.add("open");
  } catch (e) { setMsg("Error al abrir comprobante: " + e.message, "error"); }
}
function closeReceipt() {
  $("receiptModal").classList.remove("open");
  const img = $("receiptImg");
  if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  img.src = "";
}

// ============ NOTIFICACIONES ============
async function requestNotifPermission() {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch {}
}

function notify(title, body) {
  // 1) Notificación del sistema operativo (best-effort).
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {}
  // 2) Banner dentro de la app (siempre visible mientras esté abierta).
  const b = $("notifBanner");
  b.textContent = `${title} — ${body}`;
  b.classList.add("show");
  clearTimeout(b._t);
  b._t = setTimeout(() => b.classList.remove("show"), 8000);
  // 3) Sonido corto de atención.
  beep();
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.start(); o.stop(ctx.currentTime + 0.36);
  } catch {}
}

// ============ CONFIGURACIÓN ============
async function loadConfig() {
  $("cfgMsg").textContent = "Cargando...";
  try {
    const s = await api("/api/admin/settings");
    $("tgGateway").checked = s.gatewayEnabled !== false;
    $("tgManual").checked = s.manualEnabled !== false;
    accounts = Array.isArray(s.bankAccounts) ? s.bankAccounts.map((a) => ({ label: a.label || "", value: a.value || "", hint: a.hint || "" })) : [];
    renderAccounts();
    $("cfgMsg").textContent = "";
  } catch (e) { $("cfgMsg").textContent = "Error: " + e.message; }
}

function renderAccounts() {
  const box = $("accounts");
  if (accounts.length === 0) { box.innerHTML = `<div class="method">Sin cuentas. Agrega al menos una para recibir transferencias.</div>`; return; }
  box.innerHTML = accounts.map((a, i) => `
    <div class="acct">
      <input placeholder="Medio (ej: Nequi)" value="${esc(a.label)}" data-i="${i}" data-f="label">
      <input placeholder="Número / llave" value="${esc(a.value)}" data-i="${i}" data-f="value">
      <input placeholder="A nombre de... (opcional)" value="${esc(a.hint)}" data-i="${i}" data-f="hint">
      <button class="sm" data-del="${i}">✕</button>
    </div>`).join("");
  box.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("input", () => { accounts[inp.dataset.i][inp.dataset.f] = inp.value; });
  });
  box.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => { accounts.splice(Number(btn.dataset.del), 1); renderAccounts(); });
  });
}

async function saveConfig() {
  const gatewayEnabled = $("tgGateway").checked;
  const manualEnabled = $("tgManual").checked;
  if (!gatewayEnabled && !manualEnabled) { $("cfgMsg").textContent = "Debe quedar al menos un canal activo."; return; }
  const clean = accounts
    .map((a) => ({ label: (a.label || "").trim(), value: (a.value || "").trim(), hint: (a.hint || "").trim() }))
    .filter((a) => a.label && a.value);
  $("cfgMsg").textContent = "Guardando...";
  try {
    await api("/api/admin/settings", { method: "POST", body: JSON.stringify({ gatewayEnabled, manualEnabled, bankAccounts: clean, adminEmail: "admin-desktop" }) });
    accounts = clean; renderAccounts();
    $("cfgMsg").textContent = "✓ Guardado";
    setTimeout(() => { $("cfgMsg").textContent = ""; }, 2500);
  } catch (e) { $("cfgMsg").textContent = "Error: " + e.message; }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}
