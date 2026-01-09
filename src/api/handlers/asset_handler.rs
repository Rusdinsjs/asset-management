//! Asset Handler

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::{
    ApiResponse, AssetSearchParams, CreateAssetRequest, PaginatedResponse, PaginationParams,
    UpdateAssetRequest,
};
use crate::application::services::asset_service::AssetOperationResult;
use crate::domain::entities::user::UserClaims;
use crate::domain::entities::{Asset, AssetSummary};
use crate::shared::errors::AppError;
use axum::{extract::Extension, response::IntoResponse};

pub async fn list_assets(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<PaginatedResponse<AssetSummary>>, AppError> {
    let result = state
        .asset_service
        .list(params.page(), params.per_page())
        .await?;
    Ok(Json(result))
}

pub async fn search_assets(
    State(state): State<AppState>,
    Query(params): Query<AssetSearchParams>,
) -> Result<Json<PaginatedResponse<AssetSummary>>, AppError> {
    let result = state.asset_service.search(params).await?;
    Ok(Json(result))
}

pub async fn get_asset(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Asset>, AppError> {
    let asset = state.asset_service.get_by_id(id).await?;
    Ok(Json(asset))
}

pub async fn create_asset(
    State(state): State<AppState>,
    Extension(claims): Extension<UserClaims>,
    Json(payload): Json<CreateAssetRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Parse user_id from subject
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID in token".to_string()))?;

    let result = state
        .asset_service
        .create(payload, user_id, claims.role_level)
        .await?;

    match result {
        AssetOperationResult::Success(asset) => Ok((
            StatusCode::CREATED,
            Json(ApiResponse::success_with_message(asset, "Asset created")),
        )
            .into_response()),
        AssetOperationResult::PendingApproval(request) => Ok((
            StatusCode::ACCEPTED,
            Json(ApiResponse::success_with_message(
                request,
                "Approval request submitted",
            )),
        )
            .into_response()),
    }
}

pub async fn update_asset(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateAssetRequest>,
) -> Result<Json<ApiResponse<Asset>>, AppError> {
    let asset = state.asset_service.update(id, payload).await?;
    Ok(Json(ApiResponse::success_with_message(
        asset,
        "Asset updated",
    )))
}

pub async fn delete_asset(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<()>>, AppError> {
    state.asset_service.delete(id).await?;
    Ok(Json(ApiResponse::success_with_message((), "Asset deleted")))
}
