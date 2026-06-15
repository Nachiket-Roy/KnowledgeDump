use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::str::FromStr;
use tauri::Manager;

pub async fn init_db(app_handle: &tauri::AppHandle) -> Result<SqlitePool, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    
    let db_path = app_dir.join("knowledge.db");
    
    let db_url = format!("sqlite://{}", db_path.to_str().unwrap());
    
    let options = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| e.to_string())?
        .create_if_missing(true);
        
    let pool = SqlitePool::connect_with(options)
        .await
        .map_err(|e| e.to_string())?;
        
    let schema = include_str!("../schema.sql");
    sqlx::query(schema)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(pool)
}
