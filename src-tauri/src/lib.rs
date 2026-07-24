// Punto de entrada compartido por escritorio y móvil (Tauri v2).
// En móvil, `tauri::mobile_entry_point` genera el enganche nativo.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error al iniciar la aplicación Tauri");
}
