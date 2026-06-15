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
    vectors: Vec<vectordb::ChunkVector>,
    conn: State<'_, LanceDbConnection>,
) -> Result<(), String> {
    vectordb::upsert_vectors_impl(&*conn, vectors).await
}

#[tauri::command]
async fn vector_search(
    query_vector: Vec<f32>,
    conn: State<'_, LanceDbConnection>,
) -> Result<Vec<vectordb::SearchResult>, String> {
    vectordb::vector_search_impl(&*conn, query_vector).await
}

#[tauri::command]
async fn get_setting(key: String, pool: State<'_, SqlitePool>) -> Result<Option<String>, String> {
    if key == "gemini_api_key" {
        let entry = keyring::Entry::new("KnowledgeDump", "gemini_api_key").map_err(|e| e.to_string())?;
        return Ok(entry.get_password().ok());
    }

    let result: Option<String> = sqlx::query_scalar("SELECT value FROM settings WHERE key = ?")
        .bind(key)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
async fn set_setting(key: String, value: String, pool: State<'_, SqlitePool>) -> Result<(), String> {
    if key == "gemini_api_key" {
        let entry = keyring::Entry::new("KnowledgeDump", "gemini_api_key").map_err(|e| e.to_string())?;
        entry.set_password(&value).map_err(|e| e.to_string())?;
        // Cleanup legacy plaintext storage from earlier versions.
        sqlx::query("DELETE FROM settings WHERE key = ?")
            .bind("gemini_api_key")
            .execute(&*pool)
            .await
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    sqlx::query("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind(key)
        .bind(value)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn generate_gemini_description(prompt: String, _pool: State<'_, SqlitePool>) -> Result<String, String> {
    let api_key = match keyring::Entry::new("KnowledgeDump", "gemini_api_key")
        .and_then(|e| e.get_password()) 
    };

    if api_key.is_empty() {
        return Err("GEMINI_API_KEY not set".to_string());
    }
    
    let url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(4))
        .build()
        .map_err(|e| e.to_string())?;
        
    let response = client.post(url)
        .header("x-goog-api-key", api_key)
        .json(&serde_json::json!({
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to communicate with Gemini API: {}", e))?
        .error_for_status()
        .map_err(|e| format!("Gemini API returned an error status: {}", e))?;
        
    let res_json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    if let Some(text) = res_json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
        Ok(text.to_string())
    } else {
        Err("Failed to parse Gemini response".to_string())
    }
}

#[tauri::command]
async fn save_drawing(note_id: String, data: String, pool: State<'_, SqlitePool>) -> Result<(), String> {
    sqlx::query("INSERT INTO note_drawings (note_id, data) VALUES (?, ?) ON CONFLICT(note_id) DO UPDATE SET data = excluded.data")
        .bind(note_id)
        .bind(data)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_drawing(note_id: String, pool: State<'_, SqlitePool>) -> Result<Option<String>, String> {
    let row: Option<(String,)> = sqlx::query_as("SELECT data FROM note_drawings WHERE note_id = ?")
        .bind(note_id)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(row.map(|(data,)| data))
}

#[tauri::command]
async fn add_tags_to_note(
    note_id: String,
    tags: Vec<String>,
    pool: State<'_, SqlitePool>,
) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM note_tags WHERE note_id = ?")
        .bind(&note_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let unique_tags: std::collections::HashSet<String> = tags.into_iter()
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .collect();

    for tag_name in unique_tags {
        let tag_id = uuid::Uuid::new_v4().to_string();
        
        sqlx::query(
            "INSERT INTO tags (id, name) VALUES (?, ?) ON CONFLICT(name) DO NOTHING"
        )
        .bind(&tag_id)
        .bind(&tag_name)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let actual_tag_id: String = sqlx::query_scalar(
            "SELECT id FROM tags WHERE name = ?"
        )
        .bind(&tag_name)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        sqlx::query(
            "INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)"
        )
        .bind(&note_id)
        .bind(&actual_tag_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_note_tags(note_id: String, pool: State<'_, SqlitePool>) -> Result<Vec<String>, String> {
    let tags: Vec<String> = sqlx::query_scalar(
        "SELECT t.name FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?"
    )
    .bind(note_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(tags)
}

#[tauri::command]
async fn get_graph_data(pool: State<'_, SqlitePool>) -> Result<models::GraphData, String> {
    let notes: Vec<(String, String)> = sqlx::query_as("SELECT id, title FROM notes")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let tags: Vec<(String, String)> = sqlx::query_as("SELECT id, name FROM tags")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let note_tags: Vec<(String, String)> = sqlx::query_as("SELECT note_id, tag_id FROM note_tags")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut nodes = Vec::new();
    let mut links = Vec::new();

    for note in notes {
        nodes.push(models::GraphNode {
            id: note.0,
            name: note.1,
            group: "note".to_string(),
            val: 10,
        });
    }

    for tag in tags {
        nodes.push(models::GraphNode {
            id: tag.0.clone(),
            name: tag.1,
            group: "tag".to_string(),
            val: 5,
        });
    }

    for nt in note_tags {
        links.push(models::GraphLink {
            source: nt.0,
            target: nt.1,
        });
    }

    Ok(models::GraphData { nodes, links })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenvy::dotenv().ok();
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
            generate_gemini_description,
            add_tags_to_note,
            get_note_tags,
            get_graph_data,
            save_drawing,
            get_drawing,
            get_setting,
            set_setting
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
