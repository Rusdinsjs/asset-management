use axum::{
    routing::{get, post},
    Router,
};

use crate::api::handlers::approval_handler;
use crate::api::server::AppState;

pub fn approval_routes(_state: AppState) -> Router<AppState> {
    Router::new()
        .route(
            "/approvals/requests",
            post(approval_handler::create_approval_request),
        )
        .route(
            "/approvals/my-requests",
            get(approval_handler::list_my_requests),
        )
        .route(
            "/approvals/pending",
            get(approval_handler::list_pending_requests),
        )
        .route(
            "/approvals/:id/approve",
            post(approval_handler::approve_request),
        )
        .route(
            "/approvals/:id/reject",
            post(approval_handler::reject_request),
        )
}
