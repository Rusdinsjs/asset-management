//! API Handlers

pub mod asset_handler;
pub mod auth_handler;
pub mod dashboard_handler;
pub mod health_handler;
pub mod loan_handler;
pub mod lookup_handler;
pub mod maintenance_handler;
pub mod notification_handler;
pub mod rbac_handler;
pub mod sensor_handler;
pub mod work_order_handler;

pub use asset_handler::*;
pub use auth_handler::*;
pub use dashboard_handler::*;
pub use health_handler::*;
pub use loan_handler::*;
pub use lookup_handler::*;
pub use maintenance_handler::*;
pub use notification_handler::*;
pub use rbac_handler::*;
pub use sensor_handler::*;
pub use work_order_handler::*;
pub mod data_handler;
pub mod mobile_handler;
