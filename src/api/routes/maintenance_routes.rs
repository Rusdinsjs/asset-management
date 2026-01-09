use axum::{
    routing::{get, post},
    Router,
};

use crate::{api::handlers::maintenance_handler, AppState};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/maintenance",
            post(maintenance_handler::create_maintenance),
        )
        .route(
            "/api/maintenance",
            get(maintenance_handler::list_maintenance),
        )
        .route(
            "/api/maintenance/overdue",
            get(maintenance_handler::list_overdue_maintenance),
        )
        .route(
            "/api/maintenance/:id",
            get(maintenance_handler::get_maintenance),
        )
        .route(
            "/api/maintenance/:id",
            axum::routing::put(maintenance_handler::update_maintenance),
        )
        .route(
            "/api/maintenance/:id",
            axum::routing::delete(maintenance_handler::delete_maintenance),
        )
}
