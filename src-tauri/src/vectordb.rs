use std::sync::Arc;
use arrow_schema::{Schema, Field, DataType};
use arrow_array::{StringArray, FixedSizeListArray, Float32Array, RecordBatch, RecordBatchIterator};
use lancedb::connection::Connection;
use lancedb::query::{ExecutableQuery, QueryBase};
use futures::StreamExt;
use tauri::Manager;
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
        .map_err(|e| e.to_string())?;
    
    let db_path = app_dir.join("lancedb");
    
    let db_path_str = db_path.to_str().ok_or_else(|| "Invalid db path".to_string())?;
    
    let conn = lancedb::connect(db_path_str)
        .execute()
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(conn)
}

fn create_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("id", DataType::Utf8, false),
        Field::new("note_id", DataType::Utf8, false),
        Field::new("heading", DataType::Utf8, false),
        Field::new("text_snippet", DataType::Utf8, false),
        Field::new("vector", DataType::FixedSizeList(Arc::new(Field::new("item", DataType::Float32, true)), 384), false),
    ]))
}

fn into_record_batch(vectors: Vec<ChunkVector>) -> Result<RecordBatch, String> {
    let schema = create_schema();
    
    let ids: Vec<String> = vectors.iter().map(|v| v.id.clone()).collect();
    let note_ids: Vec<String> = vectors.iter().map(|v| v.note_id.clone()).collect();
    let headings: Vec<String> = vectors.iter().map(|v| v.heading.clone()).collect();
    let text_snippets: Vec<String> = vectors.iter().map(|v| v.text_snippet.clone()).collect();
    
    let mut flat_vectors = Vec::with_capacity(vectors.len() * 384);
    for v in &vectors {
        if v.vector.len() != 384 {
            return Err(format!("Vector dimension mismatch: expected 384, got {}", v.vector.len()));
        }
        flat_vectors.extend_from_slice(&v.vector);
    }
    
    let id_array = StringArray::from(ids);
    let note_id_array = StringArray::from(note_ids);
    let heading_array = StringArray::from(headings);
    let text_snippet_array = StringArray::from(text_snippets);
    
    let float_array = Float32Array::from(flat_vectors);
    let vector_array = FixedSizeListArray::try_new_from_values(float_array, 384)
        .map_err(|e| e.to_string())?;

    RecordBatch::try_new(
        schema,
        vec![
            Arc::new(id_array),
            Arc::new(note_id_array),
            Arc::new(heading_array),
            Arc::new(text_snippet_array),
            Arc::new(vector_array),
        ],
    ).map_err(|e| e.to_string())
}

pub async fn upsert_vectors_impl(
    conn: &Connection,
    vectors: Vec<ChunkVector>,
) -> Result<(), String> {
    if vectors.is_empty() {
        return Ok(());
    }
    
    let mut unique_note_ids = std::collections::HashSet::new();
    for v in &vectors {
        unique_note_ids.insert(v.note_id.clone());
    }
    
    let batch = into_record_batch(vectors)?;
    let batches = vec![batch];
    
    let table_names = conn.table_names().execute().await.map_err(|e| e.to_string())?;
    
    if table_names.contains(&"vectors".to_string()) {
        let table = conn.open_table("vectors").execute().await.map_err(|e| e.to_string())?;
        
        for note_id in unique_note_ids {
            table.delete(format!("note_id = '{}'", note_id)).await.map_err(|e| e.to_string())?;
        }
        
        table.add(Box::new(RecordBatchIterator::new(batches.into_iter().map(Ok), create_schema())))
            .execute()
            .await
            .map_err(|e| e.to_string())?;
    } else {
        conn.create_table("vectors", Box::new(RecordBatchIterator::new(batches.into_iter().map(Ok), create_schema())))
            .execute()
            .await
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

pub async fn vector_search_impl(
    conn: &Connection,
    query_vector: Vec<f32>,
) -> Result<Vec<SearchResult>, String> {
    let table_names = conn.table_names().execute().await.map_err(|e| e.to_string())?;
    if !table_names.contains(&"vectors".to_string()) {
        return Ok(vec![]);
    }
    
    let table = conn.open_table("vectors").execute().await.map_err(|e| e.to_string())?;
    
    let mut stream = table.search(&query_vector)
        .limit(10)
        .execute()
        .await
        .map_err(|e| e.to_string())?;
        
    let mut results = Vec::new();
    
    while let Some(batch_res) = stream.next().await {
        let batch = batch_res.map_err(|e| e.to_string())?;
        
        let id_col = batch.column(0).as_any().downcast_ref::<StringArray>().unwrap();
        let note_id_col = batch.column(1).as_any().downcast_ref::<StringArray>().unwrap();
        let heading_col = batch.column(2).as_any().downcast_ref::<StringArray>().unwrap();
        let text_snippet_col = batch.column(3).as_any().downcast_ref::<StringArray>().unwrap();
        
        let distance_col_idx = batch.schema().index_of("_distance").map_err(|e| e.to_string())?;
        let distance_col = batch.column(distance_col_idx).as_any().downcast_ref::<Float32Array>().unwrap();
        
        for i in 0..batch.num_rows() {
            results.push(SearchResult {
                id: id_col.value(i).to_string(),
                note_id: note_id_col.value(i).to_string(),
                heading: heading_col.value(i).to_string(),
                text_snippet: text_snippet_col.value(i).to_string(),
                distance: distance_col.value(i),
            });
        }
    }
    
    Ok(results)
}
