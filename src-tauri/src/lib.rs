mod search;
mod ai_pack;
mod archive;
mod backup;
mod media;
mod social;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![archive::inspect_archive, social::read_social_archive, search::ai_text_search, search::ai_image_search, search::ai_embed_texts, search::ai_text_model_revision, search::ai_search_status, ai_pack::inspect_offline_ai_pack, search::ai_install_search_model, backup::read_encrypted_backup_file, backup::save_encrypted_backup_file, media::read_archive_image, media::read_archive_ai_image, media::list_archive_photos])
        .run(tauri::generate_context!())
        .expect("failed to launch Offline desktop application");
}
