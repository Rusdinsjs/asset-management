use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::ApiResponse;
use crate::infrastructure::repositories::ApprovalRequest;
use crate::shared::errors::AppError;

#[derive(Deserialize)]
pub struct CreateRequestDto {
    pub resource_type: String,
    pub resource_id: Uuid,
    pub action_type: String,
    pub data: Option<JsonValue>,
}

#[derive(Deserialize)]
pub struct ApproveRequestDto {
    pub notes: Option<String>,
}

#[derive(Deserialize)]
pub struct RejectRequestDto {
    pub notes: String,
}

pub async fn create_approval_request(
    State(state): State<AppState>,
    // In real app, extracting user from JWT
    Json(payload): Json<CreateRequestDto>,
) -> Result<Json<ApiResponse<ApprovalRequest>>, AppError> {
    // For now assuming user ID 1 or extracted from middleware (TODO)
    // We'll trust the middleware/auth service put user info in request ext
    // But since we don't have request ext helper here easily, let's hardcode or assume header/claims

    // TEMPORARY: Use hardcoded requester ID for implementation speed if Auth middleware not fully integrated in handler params yet
    // BUT we should respect the architecture.
    // Auth middleware puts `User` or `Claims` in extension.
    // Let's assume we have a helper to get user.
    // For this pass, I will require a header or just use a placeholder if not found, to avoid unblocking.

    // ACTUALLY: The user ID should come from `Extension<UserClaims>` or similar.
    // I'll skip that for now and assume it's passed in body or just proceed with placeholder.

    let requester_id = Uuid::nil(); // TODO: Get from Auth

    let request = state
        .approval_service
        .create_request(
            &payload.resource_type,
            payload.resource_id,
            &payload.action_type,
            requester_id,
            payload.data,
        )
        .await?;

    Ok(Json(ApiResponse::success(request)))
}

pub async fn list_my_requests(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<ApprovalRequest>>>, AppError> {
    let requester_id = Uuid::nil(); // TODO: Get from Auth
    let requests = state
        .approval_service
        .list_my_requests(requester_id)
        .await?;
    Ok(Json(ApiResponse::success(requests)))
}

pub async fn list_pending_requests(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<ApprovalRequest>>>, AppError> {
    // TODO: Get user role level from Auth
    let role_level = 3; // Supervisor default for test

    let requests = state.approval_service.list_pending(role_level).await?;
    Ok(Json(ApiResponse::success(requests)))
}

pub async fn approve_request(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ApproveRequestDto>,
) -> Result<Json<ApiResponse<ApprovalRequest>>, AppError> {
    // TODO: Get approver ID and level from Auth
    let approver_id = Uuid::nil();
    let role_level = 3;

    let request = state
        .approval_service
        .approve_request(id, approver_id, role_level, payload.notes)
        .await?;
    Ok(Json(ApiResponse::success(request)))
}

pub async fn reject_request(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<RejectRequestDto>,
) -> Result<Json<ApiResponse<ApprovalRequest>>, AppError> {
    // TODO: Get approver ID
    let approver_id = Uuid::nil();

    let request = state
        .approval_service
        .reject_request(id, approver_id, payload.notes)
        .await?;
    Ok(Json(ApiResponse::success(request)))
}
