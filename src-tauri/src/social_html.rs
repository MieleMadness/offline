//! Non-executing HTML adapter for recognizable Meta export layouts.
//! This parser never renders source HTML in the WebView or loads external resources.

use std::collections::BTreeMap;
use chrono::{DateTime, NaiveDate, NaiveDateTime};
use scraper::{ElementRef, Html, Selector};

use super::{
    category_for, clipped, image_reference, Conversation, DataCategory, DataRecord, Message, Post,
    MAX_CONVERSATIONS, MAX_DATA_RECORDS, MAX_MESSAGES, MAX_POSTS,
};

fn select(css: &str) -> Selector {
    Selector::parse(css).expect("static internal CSS selector should parse")
}

fn text(node: ElementRef<'_>) -> String {
    clipped(&node.text().map(str::trim).filter(|t| !t.is_empty())
        .collect::<Vec<_>>().join(" ").trim().to_owned())
}

fn first_text(node: ElementRef<'_>, selector: &Selector) -> String {
    node.select(selector).next().map(text).unwrap_or_default()
}

/// Some exports use human-readable local time without a zone.
/// Interpret such timestamps as UTC for approximate sorting ONLY; source dates may differ
/// from the display timezone. Avoid inventing timestamps when the format is ambiguous.
fn time_from_html(raw: &str) -> Option<i64> {
    let s = raw.trim().split_whitespace().collect::<Vec<_>>().join(" ");
    if s.is_empty() { return None; }
    if let Ok(value) = DateTime::parse_from_rfc3339(&s) {
        return Some(value.timestamp());
    }
    let patterns = [
        "%b %e, %Y %I:%M:%S %p",
        "%B %e, %Y %I:%M:%S %p",
        "%b %e, %Y %I:%M %p",
        "%B %e, %Y %I:%M %p",
        "%b %e, %Y at %I:%M:%S %p",
        "%B %e, %Y at %I:%M:%S %p",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
    ];
    for pattern in patterns {
        if let Ok(dt) = NaiveDateTime::parse_from_str(&s, pattern) {
            return Some(dt.and_utc().timestamp());
        }
    }
    for pattern in ["%b %e, %Y", "%B %e, %Y", "%Y-%m-%d"] {
        if let Ok(date) = NaiveDate::parse_from_str(&s, pattern) {
            return date.and_hms_opt(12, 0, 0).map(|v| v.and_utc().timestamp());
        }
    }
    None
}

fn card_time(block: ElementRef<'_>, selector: &Selector) -> Option<i64> {
    for node in block.select(selector) {
        if let Some(date) = node.attr("datetime").and_then(time_from_html) {
            return Some(date);
        }
        if let Some(date) = time_from_html(&text(node)) { return Some(date); }
    }
    None
}


fn local_image_paths(block: ElementRef<'_>, selector: &Selector, source: &str) -> Vec<String> {
    let mut result = Vec::new();
    for node in block.select(selector).take(12) {
        if node.value().name() != "img" { continue; }
        if let Some(path) = node.value().attr("src")
            .and_then(|uri| image_reference(source, uri, true)) {
            if !result.contains(&path) { result.push(path); }
            if result.len() >= 8 { break; }
        }
    }
    result
}

pub(super) fn ingest_html(
    path: &str, contents: &str,
    posts: &mut Vec<Post>,
    conversations: &mut BTreeMap<String, Conversation>,
    categories: &mut BTreeMap<String, DataCategory>,
    message_total: &mut usize,
    record_total: &mut usize,
) {
    let lower = path.to_ascii_lowercase();
    let basename = lower.rsplit('/').next().unwrap_or("");
    // An HTML index is navigational; it is not a post or message.
    if basename == "index.html" || basename == "index.htm" { return; }

    let dom = Html::parse_document(contents);
    let blocks = select("div._a6-g, article._a6-g");
    let heading = select("._a6-h");
    let body = select("._a6-p");
    let timestamp = select("._a72d, time");
    let media = select("img, video");
    let document_title = select("h1");

    if lower.contains("messages/") && basename.starts_with("message") {
        let folder = path.rsplit_once('/').map_or(path, |(parent, _)| parent);
        if !conversations.contains_key(folder) && conversations.len() >= MAX_CONVERSATIONS { return; }
        let thread_title = dom.select(&document_title).next().map(text)
            .filter(|x| !x.is_empty()).unwrap_or_else(|| {
                folder.rsplit('/').next().unwrap_or("Conversation").to_owned()
            });
        let thread = conversations.entry(folder.to_owned()).or_insert_with(|| Conversation {
            id: folder.to_owned(), title: thread_title,
            participants: Vec::new(), last_timestamp: None, messages: Vec::new(),
        });
        for (index, block) in dom.select(&blocks).enumerate() {
            if *message_total >= MAX_MESSAGES { break; }
            let sender = first_text(block, &heading);
            let message = first_text(block, &body);
            let attachments = block.select(&media).count();
            if message.is_empty() && attachments == 0 { continue; }
            thread.messages.push(Message {
                id: format!("{path}#{index}"),
                sender: if sender.is_empty() { "Unknown sender".into() } else { sender },
                timestamp: card_time(block, &timestamp),
                text: message,
                attachments,
                media_paths: local_image_paths(block, &media, path),
            });
            *message_total += 1;
        }
        return;
    }

    if lower.contains("posts/") || lower.contains("/posts") || lower.contains("status_update") {
        for (index, block) in dom.select(&blocks).enumerate() {
            if posts.len() >= MAX_POSTS { break; }
            let heading_text = first_text(block, &heading);
            let content = first_text(block, &body);
            let attachments = block.select(&media).count();
            if content.is_empty() && attachments == 0 { continue; }
            posts.push(Post {
                id: format!("{path}#{index}"),
                timestamp: card_time(block, &timestamp),
                author: if heading_text.is_empty() { None } else { Some(heading_text) },
                text: content,
                media_count: attachments,
                media_paths: local_image_paths(block, &media, path),
                source_path: path.to_owned(),
            });
        }
        return;
    }

    // Unrecognized HTML data pages stay categorized by source, without claiming
    // that we decoded every field Meta includes.
    let (id, label) = category_for(path);
    let cat = categories.entry(id.to_owned()).or_insert_with(|| DataCategory {
        id: id.to_owned(), label: label.to_owned(), file_count: 0, records: Vec::new(),
    });
    cat.file_count += 1;
    for block in dom.select(&blocks).take(50) {
        if *record_total >= MAX_DATA_RECORDS { break; }
        let title = first_text(block, &heading);
        let detail = first_text(block, &body);
        if title.is_empty() && detail.is_empty() { continue; }
        cat.records.push(DataRecord {
            title: if title.is_empty() { "Exported entry".into() } else { title },
            detail, timestamp: card_time(block, &timestamp),
            source_path: path.into(),
        });
        *record_total += 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_familiar_html_post_cards() {
        let mut posts = Vec::new();
        let mut conversations = BTreeMap::new();
        let mut categories = BTreeMap::new();
        let (mut messages, mut records) = (0, 0);
        ingest_html("your_facebook_activity/posts/your_posts_1.html",
            r#"<html><div class="_a6-g"><div class="_a6-h">Taylor</div><div class="_a6-p">The picnic was wonderful!</div><div class="_a72d">2020-06-01T10:30:00Z</div><img src="../photos/image.jpg"></div></html>"#,
            &mut posts, &mut conversations, &mut categories, &mut messages, &mut records);
        assert_eq!(posts.len(), 1);
        assert_eq!(posts[0].text, "The picnic was wonderful!");
        assert_eq!(posts[0].author.as_deref(), Some("Taylor"));
        assert_eq!(posts[0].media_count, 1);
        assert_eq!(posts[0].media_paths, vec!["your_facebook_activity/photos/image.jpg"]);
        assert!(posts[0].timestamp.is_some());
    }

    #[test]
    fn combines_html_message_parts_into_one_thread() {
        let mut posts = Vec::new();
        let mut conversations = BTreeMap::new();
        let mut categories = BTreeMap::new();
        let (mut messages, mut records) = (0, 0);
        for page in ["message_1.html", "message_2.html"] {
            let path = format!("messages/inbox/example_001/{page}");
            ingest_html(&path,
                r#"<h1>Example Friend</h1><div class="_a6-g"><div class="_a6-h">Example Friend</div><div class="_a6-p">See you soon.</div><div class="_a72d">2021-05-11T10:00:00Z</div></div>"#,
                &mut posts, &mut conversations, &mut categories, &mut messages, &mut records);
        }
        assert_eq!(conversations.len(), 1);
        assert_eq!(conversations.values().next().unwrap().messages.len(), 2);
    }

    #[test]
    fn never_executes_source_html_or_fabricates_undetected_posts() {
        let mut posts = Vec::new();
        let mut conversations = BTreeMap::new();
        let mut categories = BTreeMap::new();
        let (mut messages, mut records) = (0, 0);
        ingest_html("posts/index.html", "<script>alert('private')</script>",
            &mut posts, &mut conversations, &mut categories, &mut messages, &mut records);
        assert!(posts.is_empty());
        assert!(conversations.is_empty());
    }
}
