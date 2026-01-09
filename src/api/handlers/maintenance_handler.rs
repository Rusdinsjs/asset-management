use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

use crate::{
    api::responses::{ApiResponse, PaginatedResponse},
    application::dto::{
        CreateMaintenanceRequest, MaintenanceSearchParams, UpdateMaintenanceRequest,
    },
    // domain::errors::DomainResult,
    shared::errors::AppError,
    AppState,
};

/// List maintenance records
pub async fn list_maintenance(
    State(state): State<AppState>,
    Query(params): Query<MaintenanceSearchParams>,
) -> Result<impl IntoResponse, AppError> {
    // If asset_id is provided, filter by it.
    // Ideally service should handle complex search.
    // For now we map simple listing.
    // We update service to handle search params later if needed,
    // but the task requirements are basic.
    // Let's use `list` or `list_by_asset` based on param.

    let records = if let Some(asset_id) = params.asset_id {
        state.maintenance_service.list_by_asset(asset_id).await?
    } else if let Some(_) = params.status {
        // TODO: Implement search by status in service/repo
        // For now fallback to list all (simplified)
        state
            .maintenance_service
            .list(params.page, params.per_page)
            .await?
    } else {
        state
            .maintenance_service
            .list(params.page, params.per_page)
            .await?
    };

    Ok(Json(ApiResponse::success(PaginatedResponse::new(
        records,
        0, // Total count TODO
        params.page,
        params.per_page,
    ))))
}

/// Create maintenance record
pub async fn create_maintenance(
    State(state): State<AppState>,
    Json(payload): Json<CreateMaintenanceRequest>,
) -> Result<impl IntoResponse, AppError> {
    let record = state.maintenance_service.create(payload).await?;
    Ok((StatusCode::CREATED, Json(ApiResponse::success(record))))
}

/// List overdue maintenance
pub async fn list_overdue_maintenance(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let records = state.maintenance_service.list_overdue().await?;
    Ok(Json(ApiResponse::success(records)))
}

/// Get maintenance record
pub async fn get_maintenance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let record = state.maintenance_service.get_by_id(id).await?;
    Ok(Json(ApiResponse::success(record)))
}

/// Update maintenance record
pub async fn update_maintenance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateMaintenanceRequest>,
) -> Result<impl IntoResponse, AppError> {
    let record = state.maintenance_service.update(id, payload).await?;
    Ok(Json(ApiResponse::success(record)))
}

/// Delete maintenance record
pub async fn delete_maintenance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    state.maintenance_service.delete(id).await?;
    Ok(Json(ApiResponse::success(true)))
}
