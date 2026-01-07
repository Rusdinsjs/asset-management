//! Maintenance Repository

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::{MaintenanceRecord, MaintenanceSummary};

#[derive(Clone)]
pub struct MaintenanceRepository {
    pool: PgPool,
}

impl MaintenanceRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<MaintenanceRecord>, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceRecord>("SELECT * FROM maintenance_records WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list(
        &self,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<MaintenanceSummary>, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceSummary>(
            r#"
            SELECT id, asset_id, maintenance_type_id, scheduled_date, actual_date venstatus, cost
            FROM maintenance_records
            ORDER BY scheduled_date DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_by_asset(
        &self,
        asset_id: Uuid,
    ) -> Result<Vec<MaintenanceSummary>, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceSummary>(
            r#"
            SELECT id, asset_id, maintenance_type_id, scheduled_date, actual_date, status, cost
            FROM maintenance_records
            WHERE asset_id = $1
            ORDER BY scheduled_date DESC
            "#,
        )
        .bind(asset_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_overdue(&self) -> Result<Vec<MaintenanceSummary>, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceSummary>(
            r#"
            SELECT id, asset_id, maintenance_type_id, scheduled_date, actual_date, status, cost
            FROM maintenance_records
            WHERE scheduled_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')
            ORDER BY scheduled_date
            "#,
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn create(
        &self,
        record: &MaintenanceRecord,
    ) -> Result<MaintenanceRecord, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceRecord>(
            r#"
            INSERT INTO maintenance_records (
                id, asset_id, maintenance_type_id, scheduled_date, actual_date,
                description, findings, actions_taken, cost, currency_id,
                performed_by, vendor_id, status, next_service_date, odometer_reading, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
            "#,
        )
        .bind(record.id)
        .bind(record.asset_id)
        .bind(record.maintenance_type_id)
        .bind(record.scheduled_date)
        .bind(record.actual_date)
        .bind(&record.description)
        .bind(&record.findings)
        .bind(&record.actions_taken)
        .bind(record.cost)
        .bind(record.currency_id)
        .bind(&record.performed_by)
        .bind(record.vendor_id)
        .bind(&record.status)
        .bind(record.next_service_date)
        .bind(record.odometer_reading)
        .bind(record.created_by)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update(
        &self,
        record: &MaintenanceRecord,
    ) -> Result<MaintenanceRecord, sqlx::Error> {
        sqlx::query_as::<_, MaintenanceRecord>(
            r#"
            UPDATE maintenance_records SET
                maintenance_type_id = $2, scheduled_date = $3, actual_date = $4,
                description = $5, findings = $6, actions_taken = $7, cost = $8, currency_id = $9,
                performed_by = $10, vendor_id = $11, status = $12, next_service_date = $13,
                odometer_reading = $14, updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(record.id)
        .bind(record.maintenance_type_id)
        .bind(record.scheduled_date)
        .bind(record.actual_date)
        .bind(&record.description)
        .bind(&record.findings)
        .bind(&record.actions_taken)
        .bind(record.cost)
        .bind(record.currency_id)
        .bind(&record.performed_by)
        .bind(record.vendor_id)
        .bind(&record.status)
        .bind(record.next_service_date)
        .bind(record.odometer_reading)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM maintenance_records WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
