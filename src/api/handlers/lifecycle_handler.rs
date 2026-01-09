//! Lifecycle API Handler
//!
//! Endpoints for asset lifecycle state transitions.

use axum::{
    extract::{Path, State},
    Extension, Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::ApiResponse;
use crate::application::services::LifecycleService;
use crate::domain::entities::{LifecycleHistory, UserClaims as Claims};
use crate::shared::errors::AppError;

#[derive(Deserialize)]
pub struct TransitionRequest {
    pub target_state: String,
    pub reason: Option<String>,
}

/// POST /api/assets/:id/lifecycle/transition
pub async fn transition_asset(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(asset_id): Path<Uuid>,
    Json(req): Json<TransitionRequest>,
) -> Result<Json<ApiResponse<LifecycleHistory>>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid user ID".to_string()))?;

    let history = state
        .lifecycle_service
        .transition_asset(asset_id, &req.target_state, req.reason, Some(user_id))
        .await?;

    Ok(Json(ApiResponse::success(history)))
}

/// GET /api/assets/:id/lifecycle/history
pub async fn get_lifecycle_history(
    State(state): State<AppState>,
    Path(asset_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<LifecycleHistory>>>, AppError> {
    let history = state.lifecycle_service.get_history(asset_id).await?;
    Ok(Json(ApiResponse::success(history)))
}

/// GET /api/assets/:id/lifecycle/valid-transitions
pub async fn get_valid_transitions(
    State(state): State<AppState>,
    Path(asset_id): Path<Uuid>,
) -> Result<
    Json<ApiResponse<Vec<crate::application::services::lifecycle_service::StateInfo>>>,
    AppError,
> {
    let transitions = state
        .lifecycle_service
        .get_valid_transitions(asset_id)
        .await?;
    let state_infos: Vec<_> = transitions
        .into_iter()
        .map(
            |s| crate::application::services::lifecycle_service::StateInfo {
                value: s.as_str().to_string(),
                label: s.display_name().to_string(),
                color: s.color().to_string(),
                is_terminal: s.is_terminal(),
            },
        )
        .collect();
    Ok(Json(ApiResponse::success(state_infos)))
}

/// GET /api/lifecycle/states
pub async fn get_all_states(
) -> Json<ApiResponse<Vec<crate::application::services::lifecycle_service::StateInfo>>> {
    let states = LifecycleService::get_all_states();
    Json(ApiResponse::success(states))
}
