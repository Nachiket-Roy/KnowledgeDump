pub mod models;
pub mod db;
pub mod chunker;
pub mod vectordb;

use sqlx::SqlitePool;
use lancedb::connection::Connection as LanceDbConnection;
use tauri::State;
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
    println!("Received {} vectors to upsert", vectors.len());
    Ok(())
}

#[tauri::command]
async fn vector_search(
    query_vector: Vec<f32>,
    conn: State<'_, LanceDbConnection>,
) -> Result<Vec<vectordb::SearchResult>, String> {
    println!("Received search query vector of length {}", query_vector.len());
    Ok(vec![])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            
            tauri::async_runtime::block_on(async move {
                let pool = db::init_db(&handle).await.expect("Failed to init database");
                handle.manage(pool);
                
                let lance_conn = vectordb::init_vector_db(&handle).await.expect("Failed to init LanceDB");
                handle.manage(lance_conn);
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_notes,
            get_note,
            save_note,
            delete_note,
            upsert_vectors,
            vector_search
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
