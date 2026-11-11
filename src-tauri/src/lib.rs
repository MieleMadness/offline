mod search;
mod archive;
mod social;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![archive::inspect_archive, social::read_social_archive, search::ai_embed_texts, search::ai_text_model_revision, search::ai_search_status, search::ai_install_search_model, search::ai_text_search, search::ai_image_search])
        .run(tauri::generate_context!())
        .expect("failed to launch Offline desktop application");
}
