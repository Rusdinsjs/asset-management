//! Repositories Module
//!
//! Data access layer implementations.

pub mod approval_repository;
pub mod asset_repository;
pub mod audit_repository;
pub mod category_repository;
pub mod loan_repository;
pub mod location_repository;
pub mod maintenance_repository;
pub mod notification_repository;
pub mod rbac_repository;
pub mod sensor_repository;
pub mod user_repository;
pub mod vendor_repository;
pub mod work_order_repository;

pub use approval_repository::*;
pub use asset_repository::*;
pub use audit_repository::*;
pub use category_repository::*;
pub use loan_repository::*;
pub use location_repository::*;
pub use maintenance_repository::*;
pub use notification_repository::*;
pub use rbac_repository::*;
pub use sensor_repository::*;
pub use user_repository::*;
pub use vendor_repository::*;
pub use work_order_repository::*;

/// Base repository trait
#[async_trait::async_trait]
pub trait Repository<T, ID> {
    async fn find_by_id(&self, id: ID) -> Result<Option<T>, sqlx::Error>;
    async fn find_all(&self, limit: i64, offset: i64) -> Result<Vec<T>, sqlx::Error>;
    async fn count(&self) -> Result<i64, sqlx::Error>;
    async fn create(&self, entity: T) -> Result<T, sqlx::Error>;
    async fn update(&self, entity: T) -> Result<T, sqlx::Error>;
    async fn delete(&self, id: ID) -> Result<bool, sqlx::Error>;
}
