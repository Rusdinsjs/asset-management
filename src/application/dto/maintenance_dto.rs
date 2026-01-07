//! Maintenance DTOs

use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateMaintenanceRequest {
    pub asset_id: Uuid,
    pub maintenance_type_id: Option<i32>,
    pub scheduled_date: Option<NaiveDate>,
    pub description: Option<String>,
    pub cost: Option<Decimal>,
    pub vendor_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMaintenanceRequest {
    pub maintenance_type_id: Option<i32>,
    pub scheduled_date: Option<NaiveDate>,
    pub actual_date: Option<NaiveDate>,
    pub description: Option<String>,
    pub findings: Option<String>,
    pub actions_taken: Option<String>,
    pub cost: Option<Decimal>,
    pub performed_by: Option<String>,
    pub vendor_id: Option<Uuid>,
    pub status: Option<String>,
    pub next_service_date: Option<NaiveDate>,
}
