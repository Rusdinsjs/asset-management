//! Server Configuration

use sqlx::PgPool;
use tower_http::cors::CorsLayer;

use crate::api::routes::create_router;
use crate::application::services::{
    AssetService, AuthService, DataService, LoanService, MaintenanceService, NotificationService,
    RbacService, SchedulerService, SensorService, WorkOrderService,
};
use crate::infrastructure::cache::{CacheOperations, RedisCache, RedisConfig};
use crate::infrastructure::repositories::{
    AssetRepository, LoanRepository, MaintenanceRepository, NotificationRepository, RbacRepository,
    SensorRepository, UserRepository, WorkOrderRepository,
};
use crate::shared::utils::jwt::JwtConfig;
use std::sync::Arc;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub asset_service: AssetService,
    pub auth_service: AuthService,
    pub loan_service: LoanService,
    pub maintenance_service: MaintenanceService,
    pub work_order_service: WorkOrderService,
    pub notification_service: NotificationService,
    pub rbac_service: RbacService,
    pub sensor_service: SensorService,
    pub data_service: DataService,
    pub scheduler_service: SchedulerService,
}

impl AppState {
    pub fn new(pool: PgPool, jwt_config: JwtConfig) -> Self {
        // Create repositories
        let asset_repo = AssetRepository::new(pool.clone());
        let user_repo = UserRepository::new(pool.clone());
        let loan_repo = LoanRepository::new(pool.clone());
        let maintenance_repo = MaintenanceRepository::new(pool.clone());
        let work_order_repo = WorkOrderRepository::new(pool.clone());
        let notification_repo = NotificationRepository::new(pool.clone());
        let rbac_repo = RbacRepository::new(pool.clone());
        let sensor_repo = SensorRepository::new(pool.clone());

        // Create cache
        let redis_config = RedisConfig::from_env();
        let redis_cache = RedisCache::new(&redis_config);
        let cache: Arc<dyn CacheOperations> = Arc::new(redis_cache);

        // Create services
        let asset_service = AssetService::new(asset_repo.clone(), cache.clone());
        let auth_service = AuthService::new(user_repo, jwt_config);
        let loan_service = LoanService::new(loan_repo, asset_repo.clone());
        let maintenance_service = MaintenanceService::new(maintenance_repo);
        let work_order_service = WorkOrderService::new(work_order_repo);
        let notification_service = NotificationService::new(notification_repo);
        let rbac_service = RbacService::new(rbac_repo);
        let sensor_service = SensorService::new(sensor_repo);
        let data_service = DataService::new(asset_repo);
        let scheduler_service =
            SchedulerService::new(loan_service.clone(), maintenance_service.clone());

        Self {
            asset_service,
            auth_service,
            loan_service,
            maintenance_service,
            work_order_service,
            notification_service,
            rbac_service,
            sensor_service,
            data_service,
            scheduler_service,
        }
    }
}

/// Create the application router
pub fn create_app(state: AppState) -> axum::Router {
    create_router(state).layer(CorsLayer::permissive())
}
