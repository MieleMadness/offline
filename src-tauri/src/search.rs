use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{fs::File, io::Read, time::Duration};

const TEXT_MODEL: &str = "embeddinggemma:latest";
const IMAGE_MODEL: &str = "moondream:latest";
const MAX_RESPONSE_BYTES: usize = 2 * 1024 * 1024;

#[derive(Deserialize)]
pub struct Candidate {
    id: String,
    text: String,
}
#[derive(Serialize)]
pub struct Match {
    pub id: String,
    pub reason: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchStatus {
    text_ready: bool,
    images_ready: bool,
}

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(240))
        .build()
        .map_err(|_| "Local AI client unavailable".into())
}

async fn read_response(mut response: reqwest::Response) -> Result<Value, String> {
    if !response.status().is_success() {
        return Err("The local model could not complete this request. Check that Ollama is running and has enough free memory.".into());
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "Local model response interrupted")?
    {
        if bytes.len().saturating_add(chunk.len()) > MAX_RESPONSE_BYTES {
            return Err("Local model response exceeded the safety limit.".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    serde_json::from_slice(&bytes).map_err(|_| "Local model returned invalid data.".into())
}

async fn installed(client: &reqwest::Client, model: &str) -> Result<bool, String> {
    let response = client
        .get("http://127.0.0.1:11434/api/tags")
        .send()
        .await
        .map_err(|_| "Start Ollama to use local AI search.")?;
    let value = read_response(response).await?;
    Ok(value["models"].as_array().is_some_and(|models| {
        models
            .iter()
            .any(|m| m["name"] == model && m["size"].as_u64().unwrap_or(0) > 1_000_000)
    }))
}

#[tauri::command]
pub async fn ai_search_status() -> Result<SearchStatus, String> {
    let client = client()?;
    Ok(SearchStatus {
        text_ready: installed(&client, TEXT_MODEL).await?,
        images_ready: installed(&client, IMAGE_MODEL).await?,
    })
}

// Only model assets are downloaded. This command accepts no archive or query input.
#[tauri::command]
pub async fn ai_install_search_model(images: bool) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(1800))
        .build()
        .map_err(|_| "Local AI client unavailable")?;
    let model = if images { IMAGE_MODEL } else { TEXT_MODEL };
    let response = client
        .post("http://127.0.0.1:11434/api/pull")
        .json(&json!({"model":model,"stream":false}))
        .send()
        .await
        .map_err(|_| "Model download interrupted. Start Ollama and try again.")?;
    let value = read_response(response).await?;
    if value["status"] != "success" {
        return Err("Model download did not finish. Try again.".into());
    }
    Ok(())
}

async fn embeddings(
    client: &reqwest::Client,
    inputs: Vec<String>,
) -> Result<Vec<Vec<f64>>, String> {
    if !installed(client, TEXT_MODEL).await? {
        return Err("Download the text search model first.".into());
    }
    let count = inputs.len();
    let response = client
        .post("http://127.0.0.1:11434/api/embed")
        .json(&json!({"model":TEXT_MODEL,"input":inputs,"truncate":false,"keep_alive":0}))
        .send()
        .await
        .map_err(|_| "Local text search interrupted.")?;
    let value = read_response(response).await?;
    let vectors: Vec<Vec<f64>> = serde_json::from_value(value["embeddings"].clone())
        .map_err(|_| "The text model returned invalid embeddings.")?;
    let dimensions = vectors.first().map_or(0, Vec::len);
    if vectors.len() != count
        || dimensions == 0
        || dimensions > 4096
        || vectors
            .iter()
            .any(|v| v.len() != dimensions || v.iter().any(|x| !x.is_finite()))
    {
        return Err("The text model returned incompatible embeddings.".into());
    }
    Ok(vectors)
}

fn cosine(left: &[f64], right: &[f64]) -> f64 {
    let dot: f64 = left.iter().zip(right).map(|(a, b)| a * b).sum();
    let left_norm: f64 = left.iter().map(|x| x * x).sum();
    let right_norm: f64 = right.iter().map(|x| x * x).sum();
    let divisor = (left_norm * right_norm).sqrt();
    if divisor == 0.0 {
        return 0.0;
    }
    (dot / divisor).clamp(-1.0, 1.0)
}

async fn rank(
    client: &reqwest::Client,
    query: &str,
    candidates: Vec<Candidate>,
) -> Result<Vec<Match>, String> {
    if candidates.is_empty() {
        return Ok(Vec::new());
    }
    let mut inputs = vec![format!("task: search result | query: {query}")];
    inputs.extend(
        candidates
            .iter()
            .map(|c| format!("title: Archive | text: {}", c.text)),
    );
    let vectors = embeddings(client, inputs).await?;
    let mut scored: Vec<_> = candidates
        .into_iter()
        .zip(&vectors[1..])
        .map(|(c, v)| (cosine(&vectors[0], v), c))
        .collect();
    scored.sort_by(|a, b| b.0.total_cmp(&a.0));
    Ok(scored
        .into_iter()
        .take(10)
        .map(|(score, c)| Match {
            id: c.id,
            reason: format!("Similarity {score:.3} · {}", c.text),
        })
        .collect())
}

fn validate_query(query: &str) -> Result<(), String> {
    if query.trim().is_empty() || query.len() > 1000 {
        return Err("Enter a query of at most 1000 UTF-8 bytes.".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn ai_text_search(
    query: String,
    candidates: Vec<Candidate>,
) -> Result<Vec<Match>, String> {
    validate_query(&query)?;
    if candidates.len() > 30
        || candidates
            .iter()
            .any(|c| c.text.len() > 2000 || c.id.len() > 100)
    {
        return Err("Search up to 30 preview records per request.".into());
    }
    rank(&client()?, &query, candidates).await
}

fn image_members(path: &str) -> Result<Vec<(String, String)>, String> {
    let file = File::open(path).map_err(|_| "Could not open the selected ZIP.")?;
    let mut zip = zip::ZipArchive::new(file).map_err(|_| "Invalid ZIP.")?;
    if zip.len() > 250_000 {
        return Err("Too many ZIP entries.".into());
    }
    let mut images = Vec::new();
    for i in 0..zip.len() {
        if images.len() == 8 {
            break;
        }
        let mut entry = zip.by_index(i).map_err(|_| "Unreadable ZIP entry.")?;
        let name = entry.name().to_owned();
        let lower = name.to_ascii_lowercase();
        if !lower.ends_with(".jpg") && !lower.ends_with(".jpeg") && !lower.ends_with(".png") {
            continue;
        }
        if entry.enclosed_name().is_none()
            || name.len() > 4096
            || name.contains('\\')
            || name.contains(':')
            || name.chars().any(char::is_control)
            || entry.size() > 4 * 1024 * 1024
        {
            continue;
        }
        let mut bytes = Vec::new();
        entry
            .by_ref()
            .take(4 * 1024 * 1024 + 1)
            .read_to_end(&mut bytes)
            .map_err(|_| "Image read failed.")?;
        if bytes.len() > 4 * 1024 * 1024 {
            continue;
        }
        if !(bytes.starts_with(b"\x89PNG\r\n\x1a\n") || bytes.starts_with(b"\xff\xd8\xff")) {
            continue;
        }
        let dimensions =
            imagesize::blob_size(&bytes).map_err(|_| "Image header is damaged or unsupported.")?;
        if dimensions.width == 0
            || dimensions.height == 0
            || dimensions.width.saturating_mul(dimensions.height) > 25_000_000
        {
            continue;
        }
        images.push((
            name,
            base64::engine::general_purpose::STANDARD.encode(bytes),
        ));
    }
    Ok(images)
}

#[tauri::command]
pub async fn ai_image_search(query: String, path: String) -> Result<Vec<Match>, String> {
    validate_query(&query)?;
    let client = client()?;
    if !installed(&client, IMAGE_MODEL).await? {
        return Err("Download the image search model first.".into());
    }
    // Require the ranking model before sending images to the vision model.
    if !installed(&client, TEXT_MODEL).await? {
        return Err("Download the text search model first.".into());
    }
    let images = tauri::async_runtime::spawn_blocking(move || image_members(&path))
        .await
        .map_err(|_| "Image scan interrupted.")??;
    let mut captions = Vec::new();
    for (name, image) in images {
        let response = client.post("http://127.0.0.1:11434/api/generate")
            .json(&json!({"model":IMAGE_MODEL,"prompt":"Describe the image briefly.",
                "images":[image],"stream":false,"options":{"temperature":0,"num_predict":128},"keep_alive":0}))
            .send().await.map_err(|_| "Local image search interrupted.")?;
        let value = read_response(response).await?;
        let caption = value["response"]
            .as_str()
            .filter(|s| !s.trim().is_empty())
            .ok_or("The image model returned an empty description.")?;
        captions.push(Candidate {
            id: name,
            text: caption.chars().take(450).collect(),
        });
    }
    rank(&client, &query, captions).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ranks_direction_independently_of_vector_length_and_handles_zero() {
        assert!((cosine(&[2.0, 0.0], &[1.0, 0.0]) - 1.0).abs() < 1e-9);
        assert_eq!(cosine(&[1.0, 0.0], &[-1.0, 0.0]), -1.0);
        assert_eq!(cosine(&[1.0, 0.0], &[0.0, 1.0]), 0.0);
        assert_eq!(cosine(&[0.0, 0.0], &[1.0, 0.0]), 0.0);
    }

    #[test]
    fn rejects_invalid_inputs_before_contacting_a_model() {
        tauri::async_runtime::block_on(async {
            assert!(ai_text_search(" ".into(), vec![]).await.is_err());
            let candidates = (0..31)
                .map(|i| Candidate {
                    id: i.to_string(),
                    text: "synthetic".into(),
                })
                .collect();
            assert!(ai_text_search("weather".into(), candidates).await.is_err());
            assert!(ai_embed_texts(vec!["synthetic".into(); 17], false).await.is_err());
            assert!(ai_embed_texts(vec!["one".into(), "two".into()], true).await.is_err());
            assert!(ai_embed_texts(vec!["x".repeat(2001)], false).await.is_err());
        });
    }

    fn fixture_zip(entries: &[(&str, &[u8])]) -> std::path::PathBuf {
        use std::io::Write;
        use zip::write::SimpleFileOptions;
        let name = format!(
            "offline-ai-fixture-{}-{}.zip",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        let path = std::env::temp_dir().join(name);
        let file = File::create(&path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        for (name, bytes) in entries {
            zip.start_file(*name, SimpleFileOptions::default()).unwrap();
            zip.write_all(bytes).unwrap();
        }
        zip.finish().unwrap();
        path
    }

    #[test]
    fn excludes_unsafe_and_oversized_image_members() {
        let png = include_bytes!("../tests/fixtures/red-square.png");
        let mut oversized = png.to_vec();
        oversized[16..20].copy_from_slice(&100_000_u32.to_be_bytes());
        oversized[20..24].copy_from_slice(&100_000_u32.to_be_bytes());
        let path = fixture_zip(&[
            ("../private.png", png),
            ("huge.png", &oversized),
            ("photos/valid.png", png),
        ]);
        let result = image_members(path.to_str().unwrap());
        std::fs::remove_file(path).unwrap();
        let images = result.unwrap();
        assert_eq!(images.len(), 1);
        assert_eq!(images[0].0, "photos/valid.png");
    }

    #[test]
    #[ignore = "Requires local Ollama and downloaded EmbeddingGemma"]
    fn local_text_inference_ranks_by_meaning() {
        let results = tauri::async_runtime::block_on(ai_text_search(
            "rainy weather".into(),
            vec![
                Candidate {
                    id: "umbrella".into(),
                    text: "I packed an umbrella and waterproof boots.".into(),
                },
                Candidate {
                    id: "pasta".into(),
                    text: "We cooked pasta with tomato sauce.".into(),
                },
            ],
        ))
        .unwrap();
        assert_eq!(results[0].id, "umbrella");
    }

    #[test]
    #[ignore = "Requires local Ollama and downloaded EmbeddingGemma and Moondream"]
    fn local_image_inference_ranks_by_visual_content() {
        let path = fixture_zip(&[
            (
                "photos/red-square.png",
                include_bytes!("../tests/fixtures/red-square.png"),
            ),
            (
                "photos/blue-circle.png",
                include_bytes!("../tests/fixtures/blue-circle.png"),
            ),
        ]);
        let result = tauri::async_runtime::block_on(ai_image_search(
            "a red square".into(),
            path.to_str().unwrap().into(),
        ));
        std::fs::remove_file(path).unwrap();
        assert_eq!(result.unwrap()[0].id, "photos/red-square.png");
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingBatch {
    model_revision: String,
    vectors: Vec<Vec<f64>>,
}

#[tauri::command]
pub async fn ai_text_model_revision() -> Result<String, String> {
    let response = client()?
        .get("http://127.0.0.1:11434/api/tags")
        .send()
        .await
        .map_err(|_| "Start Ollama to use local search.")?;
    let value = read_response(response).await?;
    value["models"]
        .as_array()
        .and_then(|models| models.iter().find(|m| m["name"] == TEXT_MODEL))
        .and_then(|m| m["digest"].as_str())
        .map(str::to_owned)
        .ok_or("Download the text search model first.".into())
}

#[tauri::command]
pub async fn ai_embed_texts(texts: Vec<String>, query: bool) -> Result<EmbeddingBatch, String> {
    if texts.is_empty()
        || texts.len() > 16
        || (query && texts.len() != 1)
        || texts
            .iter()
            .any(|text| text.len() > if query { 1000 } else { 2000 })
    {
        return Err("The search batch exceeds the supported size.".into());
    }
    let revision = ai_text_model_revision().await?;
    let inputs = texts
        .into_iter()
        .map(|text| {
            if query {
                format!("task: search result | query: {text}")
            } else {
                format!("title: Archive | text: {text}")
            }
        })
        .collect();
    let vectors = embeddings(&client()?, inputs).await?;
    if ai_text_model_revision().await? != revision {
        return Err("The search model changed. Rebuild the workspace index.".into());
    }
    Ok(EmbeddingBatch {
        model_revision: revision,
        vectors,
    })
}
