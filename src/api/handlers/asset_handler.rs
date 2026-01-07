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
use crate::domain::entities::{Asset, AssetSummary};
use crate::shared::errors::AppError;

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
    Json(payload): Json<CreateAssetRequest>,
) -> Result<(StatusCode, Json<ApiResponse<Asset>>), AppError> {
    let asset = state.asset_service.create(payload).await?;
    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(asset, "Asset created")),
    ))
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
