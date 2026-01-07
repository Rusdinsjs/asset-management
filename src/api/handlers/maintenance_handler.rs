//! Maintenance Handler

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::{
    ApiResponse, CreateMaintenanceRequest, PaginationParams, UpdateMaintenanceRequest,
};
use crate::domain::entities::{MaintenanceRecord, MaintenanceSummary};
use crate::shared::errors::AppError;

pub async fn list_maintenance(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<MaintenanceSummary>>, AppError> {
    let records = state
        .maintenance_service
        .list(params.page(), params.per_page())
        .await?;
    Ok(Json(records))
}

pub async fn get_maintenance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<MaintenanceRecord>, AppError> {
    let record = state.maintenance_service.get_by_id(id).await?;
    Ok(Json(record))
}

pub async fn create_maintenance(
    State(state): State<AppState>,
    Json(payload): Json<CreateMaintenanceRequest>,
) -> Result<(StatusCode, Json<ApiResponse<MaintenanceRecord>>), AppError> {
    let record = state.maintenance_service.create(payload).await?;
    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(
            record,
            "Maintenance created",
        )),
    ))
}

pub async fn update_maintenance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateMaintenanceRequest>,
) -> Result<Json<ApiResponse<MaintenanceRecord>>, AppError> {
    let record = state.maintenance_service.update(id, payload).await?;
    Ok(Json(ApiResponse::success_with_message(
        record,
        "Maintenance updated",
    )))
}

pub async fn delete_maintenance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    state.maintenance_service.delete(id).await?;
    Ok(Json(ApiResponse::success_with_message(
        (),
        "Maintenance deleted",
    )))
}

pub async fn list_overdue_maintenance(
    State(state): State<AppState>,
) -> Result<Json<Vec<MaintenanceSummary>>, AppError> {
    let records = state.maintenance_service.list_overdue().await?;
    Ok(Json(records))
}
