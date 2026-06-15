pub mod models;
pub mod db;
pub mod chunker;
pub mod vectordb;

use sqlx::SqlitePool;
use lancedb::connection::Connection as LanceDbConnection;
use tauri::{State, Manager};
use models::Note;

#[tauri::command]
async fn list_notes(pool: State<'_, SqlitePool>) -> Result<Vec<Note>, String> {
    sqlx::query_as::<_, Note>(
        r#"
        SELECT id, title, content, created_at, updated_at
        FROM notes
        ORDER BY updated_at DESC
        "#
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_note(id: String, pool: State<'_, SqlitePool>) -> Result<Note, String> {
    sqlx::query_as::<_, Note>(
        r#"
        SELECT id, title, content, created_at, updated_at
        FROM notes
        WHERE id = ?
        "#
    )
    .bind(id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_note(
    id: String,
    title: String,
    content: String,
    pool: State<'_, SqlitePool>,
) -> Result<String, String> {
    sqlx::query(
        r#"
        INSERT INTO notes (id, title, content)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            content = excluded.content,
            updated_at = CURRENT_TIMESTAMP
        "#
    )
    .bind(&id)
    .bind(&title)
    .bind(&content)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
async fn delete_note(id: String, pool: State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query(
        r#"
        DELETE FROM notes
        WHERE id = ?
        "#
    )
    .bind(id)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn upsert_vectors(
    _vectors: Vec<vectordb::ChunkVector>,
    _conn: State<'_, LanceDbConnection>,
) -> Result<(), String> {
    Err("Not yet implemented".to_string())
}

#[tauri::command]
async fn vector_search(
    _query_vector: Vec<f32>,
    _conn: State<'_, LanceDbConnection>,
) -> Result<Vec<vectordb::SearchResult>, String> {
    Err("Not yet implemented".to_string())
}

#[tauri::command]
async fn generate_gemini_description(_prompt: String) -> Result<String, String> {
    dotenvy::dotenv().ok();
    let api_key = std::env::var("GEMINI_API_KEY").map_err(|_| "GEMINI_API_KEY not set".to_string())?;
    
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}", api_key);
    
    let client = reqwest::Client::new();
    let response = client.post(&url)
        .json(&serde_json::json!({
            "contents": [{
                "parts": [{"text": _prompt}]
            }]
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
        
    let res_json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    if let Some(text) = res_json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
        Ok(text.to_string())
    } else {
        Err("Failed to parse Gemini response".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            
            tauri::async_runtime::block_on(async move {
                let pool = db::init_db(&handle).await.map_err(|e| Box::<dyn std::error::Error>::from(e))?;
                handle.manage(pool);
                
                let lance_conn = vectordb::init_vector_db(&handle).await.map_err(|e| Box::<dyn std::error::Error>::from(e))?;
                handle.manage(lance_conn);
                Ok::<(), Box<dyn std::error::Error>>(())
            })?;
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_notes,
            get_note,
            save_note,
            delete_note,
            upsert_vectors,
            vector_search,
            generate_gemini_description
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
