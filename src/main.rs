mod config;
mod handlers;
mod middleware;
mod models;
mod utils;

use axum::{
    middleware as axum_middleware,
    routing::{get, post},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;

use crate::config::AppConfig;
use crate::handlers::*;
use crate::middleware::auth_middleware;

#[tokio::main]
async fn main() {
    let config = AppConfig::from_env();

    // Database connection pool
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

    // Public routes (no auth required)
    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/auth/login", post(login));

    // Lookup routes (no auth for simplicity, can be protected later)
    let lookup_routes = Router::new()
        .route("/api/lookups/currencies", get(list_currencies))
        .route("/api/lookups/units", get(list_units))
        .route("/api/lookups/conditions", get(list_asset_conditions))
        .route(
            "/api/lookups/maintenance-types",
            get(list_maintenance_types),
        );

    // Protected routes (require auth)
    let protected_routes = Router::new()
        // Categories
        .route(
            "/api/categories",
            get(list_categories).post(create_category),
        )
        .route(
            "/api/categories/:id",
            get(get_category)
                .put(update_category)
                .delete(delete_category),
        )
        // Locations
        .route("/api/locations", get(list_locations).post(create_location))
        .route(
            "/api/locations/:id",
            get(get_location)
                .put(update_location)
                .delete(delete_location),
        )
        // Vendors
        .route("/api/vendors", get(list_vendors).post(create_vendor))
        .route(
            "/api/vendors/:id",
            get(get_vendor).put(update_vendor).delete(delete_vendor),
        )
        // Assets
        .route("/api/assets", get(list_assets).post(create_asset))
        .route(
            "/api/assets/:id",
            get(get_asset).put(update_asset).delete(delete_asset),
        )
        // Maintenance
        .route(
            "/api/maintenance",
            get(list_maintenance).post(create_maintenance),
        )
        .route(
            "/api/maintenance/:id",
            get(get_maintenance)
                .put(update_maintenance)
                .delete(delete_maintenance),
        )
        .layer(axum_middleware::from_fn(auth_middleware));

    // Combine all routes
    let app = Router::new()
        .merge(public_routes)
        .merge(lookup_routes)
        .merge(protected_routes)
        .layer(CorsLayer::permissive())
        .with_state(pool);

    let addr: SocketAddr = format!("{}:{}", config.server_host, config.server_port)
        .parse()
        .expect("Invalid server address");

    println!("🚀 Asset Management API running on http://{}", addr);
    println!("📖 API Endpoints:");
    println!("   - GET  /health");
    println!("   - POST /api/auth/login");
    println!("   - GET  /api/lookups/*");
    println!("   - CRUD /api/categories");
    println!("   - CRUD /api/locations");
    println!("   - CRUD /api/vendors");
    println!("   - CRUD /api/assets");
    println!("   - CRUD /api/maintenance");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
