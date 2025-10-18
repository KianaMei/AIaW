use std::fs;
use uuid::Uuid;

#[tauri::command]
pub async fn create_temp_html(html_content: String) -> Result<String, String> {
    let temp_dir = std::env::temp_dir();
    let file_name = format!("aiaw_html_preview_{}.html", Uuid::new_v4());
    let file_path = temp_dir.join(file_name);

    fs::write(&file_path, html_content).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

