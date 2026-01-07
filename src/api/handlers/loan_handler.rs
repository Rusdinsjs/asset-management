//! Loan Handler

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::api::server::AppState;
use crate::application::dto::{ApiResponse, CreateLoanRequest, PaginationParams};
use crate::domain::entities::Loan;
use crate::shared::errors::AppError;

pub async fn list_loans(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<Loan>>, AppError> {
    let loans = state
        .loan_service
        .list(params.page(), params.per_page())
        .await?;
    Ok(Json(loans))
}

pub async fn get_loan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Loan>, AppError> {
    let loan = state.loan_service.get_by_id(id).await?;
    Ok(Json(loan))
}

pub async fn create_loan(
    State(state): State<AppState>,
    Json(payload): Json<CreateLoanRequest>,
) -> Result<(StatusCode, Json<ApiResponse<Loan>>), AppError> {
    let loan = state.loan_service.create(payload).await?;
    Ok((
        StatusCode::CREATED,
        Json(ApiResponse::success_with_message(loan, "Loan created")),
    ))
}

pub async fn approve_loan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<Loan>>, AppError> {
    // TODO: Get approver_id from auth context
    let approver_id = Uuid::new_v4();
    let loan = state.loan_service.approve(id, approver_id).await?;
    Ok(Json(ApiResponse::success_with_message(
        loan,
        "Loan approved",
    )))
}

pub async fn list_overdue_loans(
    State(state): State<AppState>,
) -> Result<Json<Vec<Loan>>, AppError> {
    let loans = state.loan_service.list_overdue().await?;
    Ok(Json(loans))
}
