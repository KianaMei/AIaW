// Hide the extra Windows console window in both debug and release builds.
// DevTools can still be opened with F12 / Ctrl+Shift+I via JS.
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

fn main() {
    let _ = fix_path_env::fix();
    #[cfg(target_os = 'windows')]\n    std::env::set_var('WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS', '--auto-open-devtools-for-tabs');\n    app_lib::run();
}

