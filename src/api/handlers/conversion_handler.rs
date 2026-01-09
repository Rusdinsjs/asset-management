//! Conversion API Handler
//!
//! Endpoints for asset transformation/conversion workflow.

use axum::{
    extract::{Path, State},
    Extension, Json,
};
use rust_decimal::Decimal;
use serde::Deserialize;
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::ApiResponse;
use crate::domain::entities::{AssetConversion, UserClaims as Claims};
use crate::shared::errors::AppError;

#[derive(Deserialize)]
pub struct CreateConversionRequest {
    pub from_category_id: Option<Uuid>,
    pub to_category_id: Option<Uuid>,
    pub from_subtype: Option<String>,
    pub to_subtype: Option<String>,
    pub conversion_type: String,
    pub conversion_cost: Option<Decimal>,
    pub old_specifications: Option<serde_json::Value>,
    pub new_specifications: Option<serde_json::Value>,
    pub justification: String,
}

#[derive(Deserialize)]
pub struct RejectRequest {
    pub reason: String,
}

/// POST /api/assets/:id/conversion-requests
pub async fn create_conversion_request(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(asset_id): Path<Uuid>,
    Json(req): Json<CreateConversionRequest>,
) -> Result<Json<ApiResponse<AssetConversion>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;

    let conversion = state
        .conversion_service
        .request_conversion(
            asset_id,
            req.from_category_id,
            req.to_category_id,
            req.from_subtype,
            req.to_subtype,
            &req.conversion_type,
            req.conversion_cost,
            req.old_specifications,
            req.new_specifications,
            &req.justification,
            user_id,
        )
        .await?;

    Ok(Json(ApiResponse::success(conversion)))
}

/// GET /api/assets/:id/conversion-requests
pub async fn get_asset_conversions(
    State(state): State<AppState>,
    Path(asset_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<AssetConversion>>>, AppError> {
    let conversions = state
        .conversion_service
        .get_asset_conversions(asset_id)
        .await?;
    Ok(Json(ApiResponse::success(conversions)))
}

/// GET /api/conversion-requests/pending
pub async fn get_pending_conversions(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<AssetConversion>>>, AppError> {
    let conversions = state.conversion_service.get_pending_conversions().await?;
    Ok(Json(ApiResponse::success(conversions)))
}

/// GET /api/conversion-requests/:id
pub async fn get_conversion(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<AssetConversion>>, AppError> {
    let conversion = state.conversion_service.get_conversion(id).await?;
    Ok(Json(ApiResponse::success(conversion)))
}

/// PUT /api/conversion-requests/:id/approve
pub async fn approve_conversion(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<AssetConversion>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;

    let conversion = state
        .conversion_service
        .approve_conversion(id, user_id)
        .await?;
    Ok(Json(ApiResponse::success(conversion)))
}

/// PUT /api/conversion-requests/:id/reject
pub async fn reject_conversion(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<RejectRequest>,
) -> Result<Json<ApiResponse<AssetConversion>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;

    let conversion = state
        .conversion_service
        .reject_conversion(id, user_id, &req.reason)
        .await?;
    Ok(Json(ApiResponse::success(conversion)))
}

/// POST /api/conversion-requests/:id/execute
pub async fn execute_conversion(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<AssetConversion>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;

    let conversion = state
        .conversion_service
        .execute_conversion(id, user_id)
        .await?;
    Ok(Json(ApiResponse::success(conversion)))
}

/// POST /api/conversion-requests/:id/complete
pub async fn complete_conversion(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<AssetConversion>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;

    let conversion = state
        .conversion_service
        .complete_conversion(id, user_id)
        .await?;
    Ok(Json(ApiResponse::success(conversion)))
}
