// IA Chart Copilot — Panel Admin (Tauri v2).
// El binario de escritorio solo delega en la librería compartida (lib.rs),
// que también es el punto de entrada en móvil.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    iachart_admin_lib::run()
}
