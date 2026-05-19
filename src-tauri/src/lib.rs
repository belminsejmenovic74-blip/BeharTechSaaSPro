// Behar Tech Pro — Tauri entry point.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        // Updater : check et applique les nouvelles versions depuis le
        // manifeste latest.json publié par GitHub Releases.
        .plugin(tauri_plugin_updater::Builder::new().build())
        // Process : permet le relaunch() automatique après applyUpdate().
        .plugin(tauri_plugin_process::init())
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                // Optional: open devtools in debug builds
                // app.get_webview_window("main").map(|w| w.open_devtools());
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Behar Tech Pro");
}
