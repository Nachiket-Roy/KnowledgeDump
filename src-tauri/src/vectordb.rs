use lancedb::connection::Connection;
use std::sync::Arc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ChunkVector {
    pub id: String,
    pub note_id: String,
    pub heading: String,
    pub text_snippet: String,
    pub vector: Vec<f32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    pub id: String,
    pub note_id: String,
    pub heading: String,
    pub text_snippet: String,
    pub distance: f32,
}

pub async fn init_vector_db(app_handle: &tauri::AppHandle) -> Result<Connection, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    
    let db_path = app_dir.join("lancedb");
    
    let conn = lancedb::connect(db_path.to_str().unwrap())
        .execute()
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(conn)
}
