//! Asset Repository
//!
//! Data access for Asset entities.

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::{Asset, AssetHistory, AssetSummary};

/// Asset repository
#[derive(Clone)]
pub struct AssetRepository {
    pool: PgPool,
}

impl AssetRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Find asset by ID
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Asset>, sqlx::Error> {
        sqlx::query_as::<_, Asset>(
            r#"
            SELECT 
                id, asset_code, name, category_id, location_id, department_id, assigned_to, vendor_id,
                is_rental, asset_class, status, condition_id,
                serial_number, brand, model, year_manufacture,
                specifications,
                purchase_date, purchase_price, currency_id, unit_id, quantity,
                residual_value, useful_life_months,
                qr_code_url, notes,
                created_at, updated_at
            FROM assets
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    /// Find asset by code
    pub async fn find_by_code(&self, code: &str) -> Result<Option<Asset>, sqlx::Error> {
        sqlx::query_as::<_, Asset>(
            r#"
            SELECT 
                id, asset_code, name, category_id, location_id, department_id, assigned_to, vendor_id,
                is_rental, asset_class, status, condition_id,
                serial_number, brand, model, year_manufacture,
                specifications,
                purchase_date, purchase_price, currency_id, unit_id, quantity,
                residual_value, useful_life_months,
                qr_code_url, notes,
                created_at, updated_at
            FROM assets
            WHERE asset_code = $1
            "#,
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await
    }

    /// List assets with pagination
    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<AssetSummary>, sqlx::Error> {
        sqlx::query_as::<_, AssetSummary>(
            r#"
            SELECT id, asset_code, name, status, asset_class, brand, purchase_price, category_id, location_id, model, serial_number
            FROM assets
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
    }

    /// Count total assets
    pub async fn count(&self) -> Result<i64, sqlx::Error> {
        let result: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM assets")
            .fetch_one(&self.pool)
            .await?;
        Ok(result.0)
    }

    /// Search assets
    pub async fn search(
        &self,
        query: &str,
        category_id: Option<Uuid>,
        location_id: Option<Uuid>,
        status: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<AssetSummary>, sqlx::Error> {
        sqlx::query_as::<_, AssetSummary>(
            r#"
            SELECT id, asset_code, name, status, asset_class, brand, purchase_price, category_id, location_id, model, serial_number
            FROM assets
            WHERE 
                ($1 = '' OR name ILIKE '%' || $1 || '%' OR asset_code ILIKE '%' || $1 || '%' OR serial_number ILIKE '%' || $1 || '%')
                AND ($2::uuid IS NULL OR category_id = $2)
                AND ($3::uuid IS NULL OR location_id = $3)
                AND ($4::text IS NULL OR status = $4)
            ORDER BY created_at DESC
            LIMIT $5 OFFSET $6
            "#,
        )
        .bind(query)
        .bind(category_id)
        .bind(location_id)
        .bind(status)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
    }

    /// Create new asset
    pub async fn create(&self, asset: &Asset) -> Result<Asset, sqlx::Error> {
        sqlx::query_as::<_, Asset>(
            r#"
            INSERT INTO assets (
                id, asset_code, name, category_id, location_id, department_id, assigned_to, vendor_id,
                is_rental, asset_class, status, condition_id,
                serial_number, brand, model, year_manufacture,
                specifications,
                purchase_date, purchase_price, currency_id, unit_id, quantity,
                residual_value, useful_life_months,
                qr_code_url, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
            RETURNING *
            "#,
        )
        .bind(asset.id)
        .bind(&asset.asset_code)
        .bind(&asset.name)
        .bind(asset.category_id)
        .bind(asset.location_id)
        .bind(asset.department_id)
        .bind(asset.assigned_to)
        .bind(asset.vendor_id)
        .bind(asset.is_rental)
        .bind(&asset.asset_class)
        .bind(&asset.status)
        .bind(asset.condition_id)
        .bind(&asset.serial_number)
        .bind(&asset.brand)
        .bind(&asset.model)
        .bind(asset.year_manufacture)
        .bind(&asset.specifications)
        .bind(asset.purchase_date)
        .bind(asset.purchase_price)
        .bind(asset.currency_id)
        .bind(asset.unit_id)
        .bind(asset.quantity)
        .bind(asset.residual_value)
        .bind(asset.useful_life_months)
        .bind(&asset.qr_code_url)
        .bind(&asset.notes)
        .fetch_one(&self.pool)
        .await
    }

    /// Update asset
    pub async fn update(&self, asset: &Asset) -> Result<Asset, sqlx::Error> {
        sqlx::query_as::<_, Asset>(
            r#"
            UPDATE assets SET
                asset_code = $2, name = $3, category_id = $4, location_id = $5,
                department_id = $6, assigned_to = $7, vendor_id = $8,
                is_rental = $9, asset_class = $10, status = $11, condition_id = $12,
                serial_number = $13, brand = $14, model = $15, year_manufacture = $16,
                specifications = $17,
                purchase_date = $18, purchase_price = $19, currency_id = $20, unit_id = $21, quantity = $22,
                residual_value = $23, useful_life_months = $24,
                qr_code_url = $25, notes = $26,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(asset.id)
        .bind(&asset.asset_code)
        .bind(&asset.name)
        .bind(asset.category_id)
        .bind(asset.location_id)
        .bind(asset.department_id)
        .bind(asset.assigned_to)
        .bind(asset.vendor_id)
        .bind(asset.is_rental)
        .bind(&asset.asset_class)
        .bind(&asset.status)
        .bind(asset.condition_id)
        .bind(&asset.serial_number)
        .bind(&asset.brand)
        .bind(&asset.model)
        .bind(asset.year_manufacture)
        .bind(&asset.specifications)
        .bind(asset.purchase_date)
        .bind(asset.purchase_price)
        .bind(asset.currency_id)
        .bind(asset.unit_id)
        .bind(asset.quantity)
        .bind(asset.residual_value)
        .bind(asset.useful_life_months)
        .bind(&asset.qr_code_url)
        .bind(&asset.notes)
        .fetch_one(&self.pool)
        .await
    }

    /// Update asset status
    pub async fn update_status(&self, id: Uuid, status: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("UPDATE assets SET status = $2, updated_at = NOW() WHERE id = $1")
            .bind(id)
            .bind(status)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Delete asset
    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM assets WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Get asset history
    pub async fn get_history(&self, asset_id: Uuid) -> Result<Vec<AssetHistory>, sqlx::Error> {
        sqlx::query_as::<_, AssetHistory>(
            r#"
            SELECT id, asset_id, action, from_location_id, to_location_id,
                   from_user_id, to_user_id, notes, performed_by, created_at
            FROM asset_history
            WHERE asset_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(asset_id)
        .fetch_all(&self.pool)
        .await
    }

    /// Add history entry
    pub async fn add_history(&self, history: &AssetHistory) -> Result<AssetHistory, sqlx::Error> {
        sqlx::query_as::<_, AssetHistory>(
            r#"
            INSERT INTO asset_history (id, asset_id, action, from_location_id, to_location_id,
                                       from_user_id, to_user_id, notes, performed_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            "#,
        )
        .bind(history.id)
        .bind(history.asset_id)
        .bind(&history.action)
        .bind(history.from_location_id)
        .bind(history.to_location_id)
        .bind(history.from_user_id)
        .bind(history.to_user_id)
        .bind(&history.notes)
        .bind(history.performed_by)
        .fetch_one(&self.pool)
        .await
    }
}
