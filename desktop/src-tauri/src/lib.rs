#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::Manager;
                let window = app.get_webview_window("main").unwrap();
                window.set_title("FileVault").unwrap();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running FileVault desktop app");
}
