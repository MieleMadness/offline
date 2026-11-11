//! Bounded, local-only reader of supported Facebook JSON and HTML exports.
//! ZIP members are read into memory under strict per-file and aggregate budgets.
//! Source ZIPs are never extracted or modified.

#[path = "social_html.rs"]
mod html;

use serde::Serialize;
use serde_json::Value;
use std::{
    collections::BTreeMap,
    fs::File,
    io::{Read, Seek},
    path::Path,
};
use zip::ZipArchive;

const MAX_ENTRIES: usize = 250_000;
const MAX_TEXT_FILES: usize = 1_000;
const MAX_TEXT_FILE_BYTES: u64 = 4 * 1024 * 1024;
const MAX_TOTAL_TEXT_BYTES: u64 = 48 * 1024 * 1024;
const MAX_POSTS: usize = 3_000;
const MAX_CONVERSATIONS: usize = 500;
const MAX_MESSAGES: usize = 12_000;
const MAX_DATA_RECORDS: usize = 900;
const MAX_TEXT_CHARS: usize = 8_000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Post {
    pub id: String,
    pub timestamp: Option<i64>,
    pub author: Option<String>,
    pub text: String,
    pub media_count: usize,
    pub source_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub sender: String,
    pub timestamp: Option<i64>,
    pub text: String,
    pub attachments: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub participants: Vec<String>,
    pub last_timestamp: Option<i64>,
    pub messages: Vec<Message>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataRecord {
    pub title: String,
    pub detail: String,
    pub timestamp: Option<i64>,
    pub source_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataCategory {
    pub id: String,
    pub label: String,
    pub file_count: usize,
    pub records: Vec<DataRecord>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SocialArchive {
    pub posts: Vec<Post>,
    pub conversations: Vec<Conversation>,
    pub data_categories: Vec<DataCategory>,
    pub files_read: usize,
    pub json_files_read: usize,
    pub html_files_read: usize,
    pub format_hint: String,
    pub files_skipped: usize,
    pub warnings: Vec<String>,
}

fn safe_name(name: &str) -> bool {
    if name.is_empty() || name.len() > 4096 || name.chars().any(char::is_control) {
        return false;
    }
    let normalized = name.replace('\\', "/");
    !normalized.starts_with('/')
        && !normalized.split('/').any(|part| part == ".." || part.contains(':'))
}

fn string_at(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        value.get(*key).and_then(Value::as_str).map(|s| s.to_owned())
    })
}

fn clipped(s: &str) -> String {
    let mut chars = s.chars();
    let limited: String = chars.by_ref().take(MAX_TEXT_CHARS).collect();
    if chars.next().is_some() { format!("{limited}…") } else { limited }
}

fn time_at(value: &Value) -> Option<i64> {
    let seconds = value.get("timestamp").and_then(Value::as_i64)
        .or_else(|| value.get("creation_timestamp").and_then(Value::as_i64))
        .or_else(|| value.get("timestamp_ms").and_then(Value::as_i64).map(|v| v / 1000));
    seconds.filter(|t| (0..=253_402_300_799).contains(t))
}

fn entries_under<'a>(value: &'a Value, keys: &[&str]) -> Vec<&'a Value> {
    if let Some(items) = value.as_array() {
        return items.iter().collect();
    }
    for key in keys {
        if let Some(items) = value.get(*key).and_then(Value::as_array) {
            return items.iter().collect();
        }
    }
    Vec::new()
}

fn post_text(value: &Value) -> String {
    if let Some(text) = string_at(value, &["text", "post", "message", "description"]) {
        return clipped(&text);
    }
    if let Some(data) = value.get("data").and_then(Value::as_array) {
        for item in data {
            if let Some(text) = string_at(item, &["post", "text", "message"]) {
                return clipped(&text);
            }
        }
    }
    clipped(&string_at(value, &["title"]).unwrap_or_default())
}

fn media_count(value: &Value) -> usize {
    let mut count = 0_usize;
    if let Some(attachments) = value.get("attachments").and_then(Value::as_array) {
        for attachment in attachments {
            if attachment.get("media").is_some() { count += 1; }
            if let Some(items) = attachment.get("data").and_then(Value::as_array) {
                count += items.iter().filter(|item| {
                    item.get("media").is_some() || item.get("external_context").is_some()
                }).count();
            }
        }
    }
    count + ["photos", "videos", "gifs", "audio", "files"]
        .iter().map(|key| value.get(*key).and_then(Value::as_array).map_or(0, Vec::len)).sum::<usize>()
}

fn ingest_posts(value: &Value, path: &str, posts: &mut Vec<Post>) {
    for (index, entry) in entries_under(value, &["posts_v2", "posts", "your_posts", "status_updates"])
        .into_iter().enumerate()
    {
        if posts.len() >= MAX_POSTS { break; }
        let text = post_text(entry);
        let media = media_count(entry);
        if text.is_empty() && media == 0 { continue; }
        posts.push(Post {
            id: format!("{path}#{index}"),
            timestamp: time_at(entry),
            author: string_at(entry, &["author"]),
            text,
            media_count: media,
            source_path: path.to_owned(),
        });
    }
}

fn is_message_file(lower: &str) -> bool {
    let basename = lower.rsplit('/').next().unwrap_or("");
    lower.contains("messages/")
        && (basename.starts_with("message_") || basename.starts_with("messages_"))
        && basename.ends_with(".json")
}

fn ingest_messages(
    value: &Value,
    path: &str,
    conversations: &mut BTreeMap<String, Conversation>,
    message_total: &mut usize,
) {
    let folder = path.rsplit_once('/').map_or(path, |(parent, _)| parent);
    if !conversations.contains_key(folder) && conversations.len() >= MAX_CONVERSATIONS { return; }
    let participants: Vec<String> = value.get("participants")
        .and_then(Value::as_array).into_iter().flatten()
        .filter_map(|p| string_at(p, &["name"]))
        .take(30)
        .collect();
    let explicit_title = string_at(value, &["title"]).filter(|x| !x.trim().is_empty());
    let fallback = folder.rsplit('/').next().unwrap_or("Conversation").to_owned();
    let title = explicit_title.or_else(|| {
        if participants.is_empty() { None } else { Some(participants.join(", ")) }
    }).unwrap_or(fallback);
    let thread = conversations.entry(folder.to_owned()).or_insert_with(|| Conversation {
        id: folder.to_owned(),
        title,
        participants: participants.clone(),
        last_timestamp: None,
        messages: Vec::new(),
    });
    // Use the first export part's identity; parts from the same folder merge into one thread.
    if thread.participants.is_empty() && !participants.is_empty() {
        thread.participants = participants;
    }
    for (index, entry) in entries_under(value, &["messages"]).into_iter().enumerate() {
        if *message_total >= MAX_MESSAGES { break; }
        let sender = string_at(entry, &["sender_name", "sender"]).unwrap_or_else(|| "Unknown sender".into());
        let body = string_at(entry, &["content", "text"]).unwrap_or_default();
        let attachments = media_count(entry);
        if body.trim().is_empty() && attachments == 0 { continue; }
        let timestamp = time_at(entry);
        thread.messages.push(Message {
            id: format!("{path}#{index}"),
            sender: clipped(&sender),
            timestamp,
            text: clipped(&body),
            attachments,
        });
        *message_total += 1;
    }
}

fn category_for(path: &str) -> (&'static str, &'static str) {
    let p = path.to_ascii_lowercase();
    if p.contains("ads") || p.contains("advertis") || p.contains("interests") {
        ("advertising", "Ads & interests")
    } else if p.contains("search") {
        ("searches", "Search history")
    } else if p.contains("location") || p.contains("checkin") || p.contains("places") {
        ("locations", "Location & check-ins")
    } else if p.contains("login") || p.contains("security") || p.contains("session") || p.contains("devices") {
        ("security", "Login & devices")
    } else if p.contains("off_facebook") || p.contains("off-facebook") || p.contains("apps_and_websites")
        || p.contains("businesses") || p.contains("your_apps") {
        ("external", "Apps & off-platform activity")
    } else if p.contains("friends") || p.contains("connections") || p.contains("followers") || p.contains("following") {
        ("connections", "Friends & connections")
    } else if p.contains("reaction") || p.contains("likes") || p.contains("comments") {
        ("engagement", "Reactions & comments")
    } else if p.contains("profile") || p.contains("personal_information") || p.contains("account") {
        ("personal", "Account & profile")
    } else {
        ("other", "Other collected data")
    }
}

fn friendly_file_name(path: &str) -> String {
    let name = path.rsplit('/').next().unwrap_or(path);
    name.trim_end_matches(".json").trim_end_matches(".html").trim_end_matches(".htm").replace('_', " ").replace('-', " ")
}

fn collect_data(
    value: &Value,
    path: &str,
    categories: &mut BTreeMap<String, DataCategory>,
    count: &mut usize,
) {
    let (id, label) = category_for(path);
    let category = categories.entry(id.into()).or_insert_with(|| DataCategory {
        id: id.into(),
        label: label.into(),
        file_count: 0,
        records: Vec::new(),
    });
    category.file_count += 1;
    if *count >= MAX_DATA_RECORDS { return; }
    let items = if value.is_array() {
        entries_under(value, &[])
    } else {
        let mut found = Vec::new();
        if let Some(map) = value.as_object() {
            for val in map.values() {
                if let Some(arr) = val.as_array() {
                    found.extend(arr.iter().take(40));
                    if found.len() >= 40 { break; }
                }
            }
        }
        found
    };
    if items.is_empty() {
        category.records.push(DataRecord {
            title: friendly_file_name(path),
            detail: "Structured export data available in this file.".into(),
            timestamp: time_at(value),
            source_path: path.into(),
        });
        *count += 1;
    } else {
        for (index, item) in items.iter().take(50).enumerate() {
            if *count >= MAX_DATA_RECORDS { break; }
            let title = string_at(item, &["title", "name", "query", "search", "label", "name_of_app"])
                .unwrap_or_else(|| format!("{} · {}", friendly_file_name(path), index + 1));
            let detail = string_at(item, &["description", "value", "text", "activity", "data"])
                .unwrap_or_else(|| {
                    // Locally rendered as plain React text, never executable HTML.
                    let raw = item.to_string();
                    raw.chars().take(240).collect()
                });
            category.records.push(DataRecord {
                title: clipped(&title),
                detail: clipped(&detail),
                timestamp: time_at(item),
                source_path: path.into(),
            });
            *count += 1;
        }
    }
}

#[tauri::command]
pub fn read_social_archive(path: String) -> Result<SocialArchive, String> {
    let source = Path::new(&path);
    if !source.is_file() || !source.extension()
        .and_then(|x| x.to_str()).is_some_and(|ext| ext.eq_ignore_ascii_case("zip"))
    {
        return Err("Select a valid ZIP file on your computer.".into());
    }
    let file = File::open(source).map_err(|_| "Unable to open this archive.".to_owned())?;
    let archive = ZipArchive::new(file).map_err(|_| "The ZIP is damaged or unsupported.".to_owned())?;
    scan(archive)
}

fn scan<R: Read + Seek>(mut archive: ZipArchive<R>) -> Result<SocialArchive, String> {
    if archive.len() > MAX_ENTRIES {
        return Err("This ZIP exceeds the 250,000-entry safety limit.".into());
    }
    let mut posts = Vec::new();
    let mut conversations = BTreeMap::new();
    let mut categories = BTreeMap::new();
    let mut warnings = Vec::new();
    let mut files_read = 0_usize;
    let mut json_files_read = 0_usize;
    let mut html_files_read = 0_usize;
    let mut attempts = 0_usize;
    let mut files_skipped = 0_usize;
    let mut bytes_read = 0_u64;
    let mut message_total = 0_usize;
    let mut record_total = 0_usize;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|_| "Could not inspect ZIP file metadata.".to_owned())?;
        if file.is_dir() { continue; }
        let path = file.name().replace('\\', "/");
        if !safe_name(&path) || file.enclosed_name().is_none() {
            return Err("Unsafe path found in archive. No content was imported.".into());
        }
        let lower = path.to_ascii_lowercase();
        let is_json = lower.ends_with(".json");
        let is_html = lower.ends_with(".html") || lower.ends_with(".htm");
        if !is_json && !is_html { continue; }
        if attempts >= MAX_TEXT_FILES || file.size() > MAX_TEXT_FILE_BYTES
            || bytes_read.saturating_add(file.size()) > MAX_TOTAL_TEXT_BYTES
        {
            files_skipped += 1;
            continue;
        }
        attempts += 1;
        let mut bytes = Vec::with_capacity(file.size() as usize);
        // A checked upper bound also protects against inaccurate ZIP directory sizes.
        file.by_ref().take(MAX_TEXT_FILE_BYTES + 1).read_to_end(&mut bytes)
            .map_err(|_| "A JSON member could not be read safely.".to_owned())?;
        if bytes.len() as u64 > MAX_TEXT_FILE_BYTES {
            files_skipped += 1;
            continue;
        }
        bytes_read += bytes.len() as u64;
        if is_html {
            let html_text = match std::str::from_utf8(&bytes) {
                Ok(value) => value,
                Err(_) => {
                    files_skipped += 1;
                    if warnings.len() < 8 {
                        warnings.push(format!("Could not decode HTML as UTF-8: {}", friendly_file_name(&path)));
                    }
                    continue;
                }
            };
            html::ingest_html(&path, html_text, &mut posts, &mut conversations,
                &mut categories, &mut message_total, &mut record_total);
            html_files_read += 1;
            files_read += 1;
            continue;
        }
        let value: Value = match serde_json::from_slice(&bytes) {
            Ok(v) => v,
            Err(_) => {
                files_skipped += 1;
                if warnings.len() < 8 {
                    warnings.push(format!("Could not parse JSON: {}", friendly_file_name(&path)));
                }
                continue;
            }
        };
        files_read += 1;
        json_files_read += 1;
        if is_message_file(&lower) {
            ingest_messages(&value, &path, &mut conversations, &mut message_total);
        } else if lower.contains("posts/") || lower.contains("/posts") || lower.contains("status_update") {
            ingest_posts(&value, &path, &mut posts);
        } else {
            collect_data(&value, &path, &mut categories, &mut record_total);
        }
    }

    posts.sort_by(|a, b| b.timestamp.cmp(&a.timestamp).then_with(|| a.id.cmp(&b.id)));
    let mut threads: Vec<Conversation> = conversations.into_values().collect();
    for thread in &mut threads {
        thread.messages.sort_by(|a, b| a.timestamp.cmp(&b.timestamp).then_with(|| a.id.cmp(&b.id)));
        thread.last_timestamp = thread.messages.iter().filter_map(|m| m.timestamp).max();
    }
    threads.sort_by(|a, b| b.last_timestamp.cmp(&a.last_timestamp).then_with(|| a.title.cmp(&b.title)));
    let mut data_categories: Vec<DataCategory> = categories.into_values().collect();
    data_categories.sort_by(|a, b| b.file_count.cmp(&a.file_count).then_with(|| a.label.cmp(&b.label)));
    for item in &mut data_categories {
        item.records.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    }
    if posts.len() >= MAX_POSTS {
        warnings.push(format!("Showing at most {MAX_POSTS} posts in this preview."));
    }
    if message_total >= MAX_MESSAGES {
        warnings.push(format!("Showing at most {MAX_MESSAGES} messages in this preview."));
    }
    if threads.len() >= MAX_CONVERSATIONS {
        warnings.push(format!("Showing at most {MAX_CONVERSATIONS} conversations."));
    }
    if record_total >= MAX_DATA_RECORDS {
        warnings.push(format!("Showing at most {MAX_DATA_RECORDS} data records."));
    }
    if files_skipped > 0 {
        warnings.push(format!("{files_skipped} JSON files were skipped because they were unsupported, invalid, or exceeded import safety limits."));
    }
    let format_hint = match (json_files_read > 0, html_files_read > 0) {
        (true, true) => "Mixed JSON and HTML",
        (true, false) => "JSON",
        (false, true) => "HTML",
        (false, false) => "No supported files",
    }.to_owned();
    Ok(SocialArchive {
        posts, conversations: threads, data_categories,
        files_read, json_files_read, html_files_read, format_hint, files_skipped, warnings,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Cursor, Write};
    use zip::{write::SimpleFileOptions, CompressionMethod, ZipWriter};

    fn fixture(files: &[(&str, &str)]) -> ZipArchive<Cursor<Vec<u8>>> {
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        for (name, body) in files {
            writer.start_file(*name, SimpleFileOptions::default()
                .compression_method(CompressionMethod::Stored)).unwrap();
            writer.write_all(body.as_bytes()).unwrap();
        }
        let data = writer.finish().unwrap().into_inner();
        ZipArchive::new(Cursor::new(data)).unwrap()
    }

    #[test]
    fn reads_posts_and_merges_messenger_parts_by_folder() {
        let archive = fixture(&[
            ("your_facebook_activity/posts/your_posts_1.json", r#"{"posts_v2":[{"timestamp":1600000000,"data":[{"post":"Hello again!"}],"attachments":[{"data":[{"media":{"uri":"photos/a.jpg"}}]}]}]}"#),
            ("your_facebook_activity/messages/inbox/erin_123/message_1.json", r#"{"title":"Erin","participants":[{"name":"Erin"},{"name":"Me"}],"messages":[{"sender_name":"Erin","timestamp_ms":1700000000000,"content":"Hi!"}]}"#),
            ("your_facebook_activity/messages/inbox/erin_123/message_2.json", r#"{"title":"Erin","messages":[{"sender_name":"Me","timestamp_ms":1600000000000,"content":"Hey there"}]}"#),
        ]);
        let result = scan(archive).unwrap();
        assert_eq!(result.posts.len(), 1);
        assert_eq!(result.posts[0].text, "Hello again!");
        assert_eq!(result.posts[0].media_count, 1);
        assert_eq!(result.conversations.len(), 1);
        assert_eq!(result.conversations[0].messages.len(), 2);
        assert_eq!(result.conversations[0].messages[0].text, "Hey there");
    }

    #[test]
    fn categorizes_data_that_meta_may_record() {
        let archive = fixture(&[
            ("ads_information/advertisers.json", r#"{"advertisers":[{"name":"Example Business"}]}"#),
            ("your_facebook_activity/search_history/your_searches.json", r#"[{"query":"coffee shops","timestamp":1690000000}]"#),
            ("security_and_login_information/logins.json", r#"{"logins":[{"name":"Device"}]}"#),
        ]);
        let result = scan(archive).unwrap();
        assert_eq!(result.data_categories.len(), 3);
        assert!(result.data_categories.iter().any(|x| x.id == "advertising"));
        assert!(result.data_categories.iter().any(|x| x.id == "searches"));
        assert!(result.data_categories.iter().any(|x| x.id == "security"));
    }

    #[test]
    fn ignores_untrusted_html_and_bounds_bad_json() {
        let archive = fixture(&[
            ("your_facebook_activity/posts/index.html", "<script>alert('x')</script>"),
            ("posts/invalid.json", "{not valid json"),
        ]);
        let result = scan(archive).unwrap();
        assert_eq!(result.posts.len(), 0);
        assert_eq!(result.files_skipped, 1);
    }

    #[test]
    fn refuses_path_traversal() {
        assert!(!safe_name("../private.json"));
        assert!(!safe_name("C:\\Users\\private.json"));
        assert!(!safe_name("/secret.json"));
        assert!(!safe_name("a\0b.json"));
    }
}
