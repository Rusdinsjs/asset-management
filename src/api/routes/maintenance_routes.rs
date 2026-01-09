use crate::{
    api::{handlers::maintenance_handler, middleware::rbac::require_permission},
    AppState,
};
use axum::{handler::Handler, middleware as axum_middleware, routing::get, Router};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/maintenance",
            get(
                maintenance_handler::list_maintenance.layer(axum_middleware::from_fn(
                    require_permission("work_order.read"),
                )),
            )
            .post(maintenance_handler::create_maintenance.layer(
                axum_middleware::from_fn(require_permission("work_order.create")),
            )),
        )
        .route(
            "/api/maintenance/overdue",
            get(
                maintenance_handler::list_overdue_maintenance.layer(axum_middleware::from_fn(
                    require_permission("work_order.read"),
                )),
            ),
        )
        .route(
            "/api/maintenance/:id",
            get(
                maintenance_handler::get_maintenance.layer(axum_middleware::from_fn(
                    require_permission("work_order.read"),
                )),
            )
            .put(
                maintenance_handler::update_maintenance.layer(axum_middleware::from_fn(
                    require_permission("work_order.update"),
                )),
            )
            .delete(
                maintenance_handler::delete_maintenance.layer(axum_middleware::from_fn(
                    require_permission("work_order.delete"),
                )),
            ),
        )
}
