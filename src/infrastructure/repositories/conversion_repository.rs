//! Conversion Repository
//!
//! Database operations for asset conversion requests.

use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::AssetConversion;
use crate::domain::errors::{DomainError, DomainResult};

#[derive(Clone)]
pub struct ConversionRepository {
    pool: PgPool,
}

impl ConversionRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Create a new conversion request
    pub async fn create_request(
        &self,
        asset_id: Uuid,
        from_category_id: Option<Uuid>,
        to_category_id: Option<Uuid>,
        from_subtype: Option<String>,
        to_subtype: Option<String>,
        conversion_type: &str,
        conversion_cost: Option<Decimal>,
        old_specifications: Option<serde_json::Value>,
        new_specifications: Option<serde_json::Value>,
        justification: &str,
        requested_by: Uuid,
    ) -> DomainResult<AssetConversion> {
        let record = sqlx::query_as!(
            AssetConversion,
            r#"
            INSERT INTO asset_conversions (
                id, asset_id, from_category_id, to_category_id, 
                from_subtype, to_subtype, conversion_type, conversion_cost,
                old_specifications, new_specifications, justification, 
                status, requested_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12)
            RETURNING *
            "#,
            Uuid::new_v4(),
            asset_id,
            from_category_id,
            to_category_id,
            from_subtype,
            to_subtype,
            conversion_type,
            conversion_cost,
            old_specifications,
            new_specifications,
            justification,
            requested_by
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(record)
    }

    /// Get conversion request by ID
    pub async fn find_by_id(&self, id: Uuid) -> DomainResult<Option<AssetConversion>> {
        let record = sqlx::query_as!(
            AssetConversion,
            r#"SELECT * FROM asset_conversions WHERE id = $1"#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(record)
    }

    /// Get all conversion requests for an asset
    pub async fn find_by_asset(&self, asset_id: Uuid) -> DomainResult<Vec<AssetConversion>> {
        let records = sqlx::query_as!(
            AssetConversion,
            r#"SELECT * FROM asset_conversions WHERE asset_id = $1 ORDER BY created_at DESC"#,
            asset_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(records)
    }

    /// Get pending conversion requests
    pub async fn find_pending(&self) -> DomainResult<Vec<AssetConversion>> {
        let records = sqlx::query_as!(
            AssetConversion,
            r#"SELECT * FROM asset_conversions WHERE status = 'pending' ORDER BY created_at ASC"#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(records)
    }

    /// Approve a conversion request
    pub async fn approve(&self, id: Uuid, approved_by: Uuid) -> DomainResult<AssetConversion> {
        let record = sqlx::query_as!(
            AssetConversion,
            r#"
            UPDATE asset_conversions 
            SET status = 'approved', approved_by = $2, approved_at = NOW()
            WHERE id = $1 AND status = 'pending'
            RETURNING *
            "#,
            id,
            approved_by
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(record)
    }

    /// Reject a conversion request
    pub async fn reject(
        &self,
        id: Uuid,
        rejected_by: Uuid,
        reason: &str,
    ) -> DomainResult<AssetConversion> {
        let record = sqlx::query_as!(
            AssetConversion,
            r#"
            UPDATE asset_conversions 
            SET status = 'rejected', approved_by = $2, approved_at = NOW(), rejection_reason = $3
            WHERE id = $1 AND status = 'pending'
            RETURNING *
            "#,
            id,
            rejected_by,
            reason
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(record)
    }

    /// Mark conversion as in progress
    pub async fn start_execution(&self, id: Uuid) -> DomainResult<AssetConversion> {
        let record = sqlx::query_as!(
            AssetConversion,
            r#"
            UPDATE asset_conversions 
            SET status = 'in_progress'
            WHERE id = $1 AND status = 'approved'
            RETURNING *
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(record)
    }

    /// Complete a conversion
    pub async fn complete(&self, id: Uuid, executed_by: Uuid) -> DomainResult<AssetConversion> {
        let record = sqlx::query_as!(
            AssetConversion,
            r#"
            UPDATE asset_conversions 
            SET status = 'completed', executed_by = $2, executed_at = NOW()
            WHERE id = $1 AND status = 'in_progress'
            RETURNING *
            "#,
            id,
            executed_by
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::Database(e.to_string()))?;

        Ok(record)
    }
}
