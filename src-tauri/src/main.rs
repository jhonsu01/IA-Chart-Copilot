// IA Chart Copilot — Panel Admin (Tauri v2)
// Esqueleto: la UI (src/) hace las llamadas a la API admin directamente vía fetch.
// En Etapa 2 se moverán las llamadas sensibles (con el token) al backend Rust
// para no exponer el token en el frontend.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error al iniciar la aplicación Tauri");
}
