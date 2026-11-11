mod search;
mod archive;
mod backup;
mod social;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![archive::inspect_archive, social::read_social_archive, search::ai_text_search, search::ai_image_search, backup::read_encrypted_backup_file, backup::save_encrypted_backup_file])
        .run(tauri::generate_context!())
        .expect("failed to launch Offline desktop application");
}
