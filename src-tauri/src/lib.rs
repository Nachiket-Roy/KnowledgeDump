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
async fn generate_gemini_description(prompt: String) -> Result<String, String> {
    let api_key = std::env::var("GEMINI_API_KEY").map_err(|_| "GEMINI_API_KEY not set".to_string())?;
    
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}", api_key);
    
    let client = reqwest::Client::new();
    let response = client.post(&url)
        .json(&serde_json::json!({
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;
        
    let res_json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    if let Some(text) = res_json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
        Ok(text.to_string())
    } else {
        Err("Failed to parse Gemini response".to_string())
    }
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

    for tag_name in tags {
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
    let notes = sqlx::query_as::<_, Note>("SELECT id, title, content, created_at, updated_at FROM notes")
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
            id: note.id.clone(),
            name: note.title,
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
            get_graph_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
