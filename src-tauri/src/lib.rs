mod is_deb;
mod stream;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            stream::stream_fetch,
            is_deb::is_deb_package
        ])
        .setup(|app| {
            // Enable logging in both debug and release; level controlled by env AIAW_LOG
            let lvl = match std::env::var("AIAW_LOG").map(|v| v.to_lowercase()) {
                Ok(s) if s == "trace" => log::LevelFilter::Trace,
                Ok(s) if s == "debug" => log::LevelFilter::Debug,
                Ok(s) if s == "warn" => log::LevelFilter::Warn,
                Ok(s) if s == "error" => log::LevelFilter::Error,
                _ => if cfg!(debug_assertions) { log::LevelFilter::Debug } else { log::LevelFilter::Info },
            };
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(lvl)
                    .build(),
            )?;

            // In debug builds, auto-open devtools on startup
            #[cfg(debug_assertions)]
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.open_devtools();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
