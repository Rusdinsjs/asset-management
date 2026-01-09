//! API Handlers

pub mod approval_handler;
pub mod asset_handler;
pub mod audit_handler; // Added
pub mod auth_handler;
pub mod category_handler;
pub mod dashboard_handler;
pub mod data_handler;
pub mod health_handler;
pub mod loan_handler;
pub mod lookup_handler;
pub mod maintenance_handler;
pub mod mobile_handler;
pub mod notification_handler;
pub mod profile_handler;
pub mod rbac_handler;
pub mod report_handler;
pub mod sensor_handler;
pub mod user_handler;
pub mod work_order_handler;

pub use approval_handler::*;
pub use asset_handler::*;
pub use audit_handler::*; // Added
pub use auth_handler::*;
pub use category_handler::*;
pub use dashboard_handler::*;
// pub use data_handler::*; // Removed to avoid conflict with report_handler::export_assets
pub use health_handler::*;
pub use loan_handler::*;
pub use lookup_handler::*;
pub use maintenance_handler::*;
pub use mobile_handler::*;
pub use notification_handler::*;
pub use profile_handler::*;
pub use rbac_handler::*;
pub use report_handler::*;
pub use sensor_handler::*;
pub use user_handler::*;
pub use work_order_handler::*;
