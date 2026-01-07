//! Work Order Handler

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::{ApiResponse, PaginationParams};
use crate::application::services::CreateWorkOrderRequest;
use crate::domain::entities::WorkOrder;
use crate::shared::errors::AppError;

pub async fn list_work_orders(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<WorkOrder>>, AppError> {
    let orders = state
        .work_order_service
        .list(params.page(), params.per_page())
        .await?;
    Ok(Json(orders))
}

pub async fn list_pending_work_orders(
    State(state): State<AppState>,
) -> Result<Json<Vec<WorkOrder>>, AppError> {
    let orders = state.work_order_service.list_pending().await?;
    Ok(Json(orders))
}

pub async fn list_overdue_work_orders(
    State(state): State<AppState>,
) -> Result<Json<Vec<WorkOrder>>, AppError> {
    let orders = state.work_order_service.list_overdue().await?;
    Ok(Json(orders))
}

pub async fn get_work_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<WorkOrder>, AppError> {
    let order = state.work_order_service.get_by_id(id).await?;
    Ok(Json(order))
}

pub async fn create_work_order(
    State(state): State<AppState>,
    Json(payload): Json<CreateWorkOrderRequest>,
) -> Result<(StatusCode, Json<ApiResponse<WorkOrder>>), AppError> {
    let order = state.work_order_service.create(payload, None).await?;
    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(
            order,
            "Work order created",
        )),
    ))
}

pub async fn approve_work_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<WorkOrder>>, AppError> {
    // TODO: Get approver from auth context
    let approver_id = Uuid::new_v4();
    let order = state.work_order_service.approve(id, approver_id).await?;
    Ok(Json(ApiResponse::success_with_message(
        order,
        "Work order approved",
    )))
}

pub async fn assign_work_order(
    State(state): State<AppState>,
    Path((id, technician_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ApiResponse<WorkOrder>>, AppError> {
    let order = state.work_order_service.assign(id, technician_id).await?;
    Ok(Json(ApiResponse::success_with_message(
        order,
        "Work order assigned",
    )))
}

pub async fn start_work_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<WorkOrder>>, AppError> {
    let order = state.work_order_service.start_work(id).await?;
    Ok(Json(ApiResponse::success_with_message(
        order,
        "Work started",
    )))
}
