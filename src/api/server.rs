//! Server Configuration

use sqlx::PgPool;
use tower_http::cors::CorsLayer;

use crate::api::routes::create_router;
use crate::application::services::{
    ApprovalService, AssetService, AuthService, CategoryService, DataService, LoanService,
    MaintenanceService, NotificationService, RbacService, SchedulerService, SensorService,
    WorkOrderService,
};
use crate::infrastructure::cache::{CacheOperations, RedisCache, RedisConfig};
use crate::infrastructure::repositories::{
    ApprovalRepository, AssetRepository, CategoryRepository, LoanRepository, MaintenanceRepository,
    NotificationRepository, RbacRepository, SensorRepository, UserRepository, WorkOrderRepository,
};
use crate::shared::utils::jwt::JwtConfig;
use std::sync::Arc;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub asset_service: AssetService,
    pub auth_service: AuthService,
    pub approval_service: ApprovalService, // Added
    pub category_service: CategoryService,
    pub loan_service: LoanService,
    pub maintenance_service: MaintenanceService,
    pub work_order_service: WorkOrderService,
    pub notification_service: NotificationService,
    pub rbac_service: RbacService,
    pub sensor_service: SensorService,
    pub data_service: DataService,
    pub scheduler_service: SchedulerService,
    pub pool: PgPool,
}

impl AppState {
    pub fn new(pool: PgPool, jwt_config: JwtConfig) -> Self {
        // Create repositories
        let asset_repo = AssetRepository::new(pool.clone());
        let user_repo = UserRepository::new(pool.clone());
        let category_repo = CategoryRepository::new(pool.clone());
        let loan_repo = LoanRepository::new(pool.clone());
        let maintenance_repo = MaintenanceRepository::new(pool.clone());
        let work_order_repo = WorkOrderRepository::new(pool.clone());
        let notification_repo = NotificationRepository::new(pool.clone());
        let rbac_repo = RbacRepository::new(pool.clone());
        let approval_repo = ApprovalRepository::new(pool.clone()); // Added
        let sensor_repo = SensorRepository::new(pool.clone());

        // Create cache
        let redis_config = RedisConfig::from_env();
        let redis_cache = RedisCache::new(&redis_config);
        let cache: Arc<dyn CacheOperations> = Arc::new(redis_cache);

        // Create services
        let approval_service = ApprovalService::new(approval_repo); // Added
        let asset_service =
            AssetService::new(asset_repo.clone(), cache.clone(), approval_service.clone());
        let auth_service = AuthService::new(user_repo, rbac_repo.clone(), jwt_config);
        let category_service = CategoryService::new(category_repo);
        let loan_service = LoanService::new(loan_repo, asset_repo.clone());
        let maintenance_service = MaintenanceService::new(
            maintenance_repo,
            asset_repo.clone(),
            approval_service.clone(),
        );
        let work_order_service = WorkOrderService::new(work_order_repo);
        let notification_service = NotificationService::new(notification_repo);
        let rbac_service = RbacService::new(rbac_repo);
        // Approval service moved up
        let sensor_service = SensorService::new(sensor_repo);
        let data_service = DataService::new(asset_repo);
        let scheduler_service =
            SchedulerService::new(loan_service.clone(), maintenance_service.clone());

        Self {
            asset_service,
            auth_service,
            category_service,
            loan_service,
            maintenance_service,
            work_order_service,
            notification_service,
            rbac_service,
            approval_service, // Added
            sensor_service,
            data_service,
            scheduler_service,
            pool,
        }
    }
}

/// Create the application router
pub fn create_app(state: AppState) -> axum::Router {
    create_router(state).layer(CorsLayer::permissive())
}
