// Hide the extra Windows console window in both debug and release builds.
// DevTools can still be opened with F12 / Ctrl+Shift+I via JS.
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

fn main() {
    let _ = fix_path_env::fix();
    app_lib::run();
}
