use crate::api::server::AppState;
use crate::models::department::{CreateDepartmentRequest, Department, UpdateDepartmentRequest};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde_json::json;
use uuid::Uuid;

// Helper to map errors
fn internal_error<E>(err: E) -> (StatusCode, Json<serde_json::Value>)
where
    E: std::fmt::Display,
{
    tracing::error!("Internal DB Error: {}", err);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "error": err.to_string() })),
    )
}

/// List all departments
pub async fn list_departments(
    State(state): State<AppState>,
) -> Result<Json<Vec<Department>>, (StatusCode, Json<serde_json::Value>)> {
    let departments =
        sqlx::query_as::<_, Department>("SELECT * FROM departments ORDER BY name ASC")
            .fetch_all(&state.pool)
            .await
            .map_err(internal_error)?;

    Ok(Json(departments))
}

/// Get single department
pub async fn get_department(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Department>, (StatusCode, Json<serde_json::Value>)> {
    let department = sqlx::query_as::<_, Department>("SELECT * FROM departments WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool) // Using optional to handle not found
        .await
        .map_err(internal_error)?
        .ok_or((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Department not found" })),
        ))?;

    Ok(Json(department))
}

/// Create new department
pub async fn create_department(
    State(state): State<AppState>,
    Json(payload): Json<CreateDepartmentRequest>,
) -> Result<Json<Department>, (StatusCode, Json<serde_json::Value>)> {
    let department = sqlx::query_as::<_, Department>(
        r#"
        INSERT INTO departments (id, code, name, description, parent_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(payload.code)
    .bind(payload.name)
    .bind(payload.description)
    .bind(payload.parent_id)
    .fetch_one(&state.pool)
    .await
    .map_err(internal_error)?;

    Ok(Json(department))
}

/// Update department
pub async fn update_department(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDepartmentRequest>,
) -> Result<Json<Department>, (StatusCode, Json<serde_json::Value>)> {
    // Check existence
    let _ = sqlx::query("SELECT id FROM departments WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(internal_error)?
        .ok_or((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Department not found" })),
        ))?;

    // Build update query dynamically or just set fields using COALESCE if simple
    // Simple approach: Use separate updates or dynamic builder.
    // I'll use a fixed query assuming partials in struct, but SQL needs help.
    // Actually, to handle partial updates cleanly in raw SQL is verbose.
    // Instead I'll fetch, merge, update.

    let current = sqlx::query_as::<_, Department>("SELECT * FROM departments WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await
        .map_err(internal_error)?;

    let code = payload.code.unwrap_or(current.code);
    let name = payload.name.unwrap_or(current.name);
    let description = payload.description.or(current.description); // If payload is None, keep existing. if Some, replace.
                                                                   // Logic: payload.description is Option<String>. If Some("foo") -> "foo". If None -> current.description.
                                                                   // Wait, UpdateDepartmentRequest should have Option<Option<String>> to allow nulling?
                                                                   // For now assuming we just update text.
    let parent_id = payload.parent_id.or(current.parent_id);

    let updated = sqlx::query_as::<_, Department>(
        r#"
        UPDATE departments 
        SET code = $1, name = $2, description = $3, parent_id = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *
        "#,
    )
    .bind(code)
    .bind(name)
    .bind(description)
    .bind(parent_id)
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .map_err(internal_error)?;

    Ok(Json(updated))
}

/// Delete department
pub async fn delete_department(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, Json<serde_json::Value>)> {
    let result = sqlx::query("DELETE FROM departments WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(internal_error)?;

    if result.rows_affected() == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Department not found" })),
        ));
    }

    Ok(StatusCode::NO_CONTENT)
}
