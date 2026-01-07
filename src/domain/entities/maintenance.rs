//! Maintenance Entity
//!
//! Maintenance records including preventive and corrective maintenance.

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Maintenance type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MaintenanceCategory {
    Preventive,
    Corrective,
    Predictive,
    Calibration,
}

impl MaintenanceCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Preventive => "preventive",
            Self::Corrective => "corrective",
            Self::Predictive => "predictive",
            Self::Calibration => "calibration",
        }
    }
}

/// Maintenance type lookup
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MaintenanceType {
    pub id: i32,
    pub code: String,
    pub name: String,
    pub is_preventive: bool,
}

/// Maintenance record
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MaintenanceRecord {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub maintenance_type_id: Option<i32>,

    pub scheduled_date: Option<NaiveDate>,
    pub actual_date: Option<NaiveDate>,

    pub description: Option<String>,
    pub findings: Option<String>,
    pub actions_taken: Option<String>,

    pub cost: Option<Decimal>,
    pub currency_id: Option<i32>,

    pub performed_by: Option<String>,
    pub vendor_id: Option<Uuid>,

    pub status: String,

    pub next_service_date: Option<NaiveDate>,
    pub odometer_reading: Option<i32>,

    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl MaintenanceRecord {
    pub fn new(asset_id: Uuid) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            asset_id,
            maintenance_type_id: None,
            scheduled_date: None,
            actual_date: None,
            description: None,
            findings: None,
            actions_taken: None,
            cost: None,
            currency_id: None,
            performed_by: None,
            vendor_id: None,
            status: "planned".to_string(),
            next_service_date: None,
            odometer_reading: None,
            created_by: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// Check if maintenance is overdue
    pub fn is_overdue(&self) -> bool {
        if let Some(scheduled) = self.scheduled_date {
            let today = Utc::now().date_naive();
            scheduled < today && self.status != "completed" && self.status != "cancelled"
        } else {
            false
        }
    }
}

/// Maintenance summary for list views
#[derive(Debug, Clone, Serialize, FromRow)]
pub struct MaintenanceSummary {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub maintenance_type_id: Option<i32>,
    pub scheduled_date: Option<NaiveDate>,
    pub actual_date: Option<NaiveDate>,
    pub status: String,
    pub cost: Option<Decimal>,
}

/// Maintenance detail with joined data
#[derive(Debug, Clone, Serialize)]
pub struct MaintenanceDetail {
    #[serde(flatten)]
    pub record: MaintenanceRecord,
    pub asset_name: Option<String>,
    pub asset_code: Option<String>,
    pub maintenance_type_name: Option<String>,
    pub vendor_name: Option<String>,
}
