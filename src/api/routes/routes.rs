//! Route Definitions

use axum::{
    middleware as axum_middleware,
    routing::{get, post},
    Router,
};

use crate::api::handlers::*;
use crate::api::middleware::auth_middleware;
use crate::api::server::AppState;

pub fn create_router(state: AppState) -> Router {
    // Public routes
    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/auth/login", post(login));

    // Lookup routes
    let lookup_routes = Router::new()
        .route("/api/lookups/currencies", get(list_currencies))
        .route("/api/lookups/units", get(list_units))
        .route("/api/lookups/conditions", get(list_conditions))
        .route(
            "/api/lookups/maintenance-types",
            get(list_maintenance_types),
        );

    // Protected routes
    let protected_routes = Router::new()
        // Assets
        .route("/api/assets", get(list_assets).post(create_asset))
        .route("/api/assets/search", get(search_assets))
        .route(
            "/api/assets/:id",
            get(get_asset).put(update_asset).delete(delete_asset),
        )
        // Maintenance
        .route(
            "/api/maintenance",
            get(list_maintenance).post(create_maintenance),
        )
        .route("/api/maintenance/overdue", get(list_overdue_maintenance))
        .route(
            "/api/maintenance/:id",
            get(get_maintenance)
                .put(update_maintenance)
                .delete(delete_maintenance),
        )
        // Work Orders
        .route(
            "/api/work-orders",
            get(list_work_orders).post(create_work_order),
        )
        .route("/api/work-orders/pending", get(list_pending_work_orders))
        .route("/api/work-orders/overdue", get(list_overdue_work_orders))
        .route("/api/work-orders/:id", get(get_work_order))
        .route("/api/work-orders/:id/approve", post(approve_work_order))
        .route(
            "/api/work-orders/:id/assign/:technician_id",
            post(assign_work_order),
        )
        .route("/api/work-orders/:id/start", post(start_work_order))
        // Loans
        .route("/api/loans", get(list_loans).post(create_loan))
        .route("/api/loans/overdue", get(list_overdue_loans))
        .route("/api/loans/:id", get(get_loan))
        .route("/api/loans/:id/approve", post(approve_loan))
        // Notifications
        .route("/api/users/:user_id/notifications", get(list_notifications))
        .route(
            "/api/users/:user_id/notifications/unread",
            get(list_unread_notifications),
        )
        .route(
            "/api/users/:user_id/notifications/unread/count",
            get(count_unread_notifications),
        )
        .route(
            "/api/users/:user_id/notifications/read-all",
            post(mark_all_notifications_as_read),
        )
        .route(
            "/api/notifications/:id/read",
            post(mark_notification_as_read),
        )
        // RBAC
        .route("/api/rbac/roles", get(list_roles))
        .route("/api/rbac/permissions", get(list_permissions))
        .route(
            "/api/rbac/roles/:role_id/permissions",
            get(get_role_permissions),
        )
        .route("/api/users/:user_id/roles", get(get_user_roles))
        .route("/api/users/:user_id/permissions", get(get_user_permissions))
        .route(
            "/api/users/:user_id/roles/:role_code",
            post(assign_role).delete(remove_role),
        )
        // Sensors
        .route(
            "/api/assets/:asset_id/sensors/readings",
            post(record_reading).get(get_latest_readings),
        )
        .route(
            "/api/assets/:asset_id/sensors/readings/range",
            get(get_readings_in_range),
        )
        .route(
            "/api/assets/:asset_id/sensors/thresholds",
            post(set_threshold),
        )
        .route("/api/sensors/alerts", get(list_active_alerts))
        .route(
            "/api/sensors/alerts/:id/acknowledge",
            post(acknowledge_alert),
        )
        .route("/api/dashboard", get(get_dashboard_stats))
        .route("/api/dashboard/activity", get(get_recent_activities))
        .route("/api/dashboard/depreciation", get(get_depreciation_summary))
        .merge(crate::api::routes::data_routes::data_routes())
        .nest(
            "/api/mobile",
            crate::api::routes::mobile_routes::mobile_routes(state.clone()),
        )
        .layer(axum_middleware::from_fn(auth_middleware));

    Router::new()
        .merge(public_routes)
        .merge(lookup_routes)
        .merge(protected_routes)
        .with_state(state)
}
