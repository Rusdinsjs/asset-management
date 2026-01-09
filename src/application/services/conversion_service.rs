//! Conversion Service
//!
//! Business logic for asset transformation/conversion workflow.

use rust_decimal::Decimal;
use uuid::Uuid;

use crate::domain::entities::{AssetConversion, AssetState, ConversionStatus};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{ConversionRepository, LifecycleRepository};

#[derive(Clone)]
pub struct ConversionService {
    conversion_repo: ConversionRepository,
    lifecycle_repo: LifecycleRepository,
}

impl ConversionService {
    pub fn new(conversion_repo: ConversionRepository, lifecycle_repo: LifecycleRepository) -> Self {
        Self {
            conversion_repo,
            lifecycle_repo,
        }
    }

    /// Request a new conversion
    pub async fn request_conversion(
        &self,
        asset_id: Uuid,
        from_category_id: Option<Uuid>,
        to_category_id: Option<Uuid>,
        from_subtype: Option<String>,
        to_subtype: Option<String>,
        conversion_type: &str,
        conversion_cost: Option<Decimal>,
        old_specs: Option<serde_json::Value>,
        new_specs: Option<serde_json::Value>,
        justification: &str,
        requested_by: Uuid,
    ) -> DomainResult<AssetConversion> {
        // Check the asset exists and is in a valid state for conversion
        let current_status = self.lifecycle_repo.get_asset_status(asset_id).await?;
        let current_state = AssetState::from_str(&current_status)
            .ok_or_else(|| DomainError::bad_request("Invalid asset state"))?;

        // Only deployed assets can be converted
        if !current_state.can_transition_to(&AssetState::UnderConversion) {
            return Err(DomainError::business_rule(
                "Conversion",
                &format!(
                    "Asset in {} state cannot be converted. Must be in Deployed state.",
                    current_state.display_name()
                ),
            ));
        }

        self.conversion_repo
            .create_request(
                asset_id,
                from_category_id,
                to_category_id,
                from_subtype,
                to_subtype,
                conversion_type,
                conversion_cost,
                old_specs,
                new_specs,
                justification,
                requested_by,
            )
            .await
    }

    /// Get conversion request by ID
    pub async fn get_conversion(&self, id: Uuid) -> DomainResult<AssetConversion> {
        self.conversion_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::not_found("Conversion", id))
    }

    /// Get all conversions for an asset
    pub async fn get_asset_conversions(
        &self,
        asset_id: Uuid,
    ) -> DomainResult<Vec<AssetConversion>> {
        self.conversion_repo.find_by_asset(asset_id).await
    }

    /// Get pending conversion requests
    pub async fn get_pending_conversions(&self) -> DomainResult<Vec<AssetConversion>> {
        self.conversion_repo.find_pending().await
    }

    /// Approve a conversion request
    pub async fn approve_conversion(
        &self,
        id: Uuid,
        approved_by: Uuid,
    ) -> DomainResult<AssetConversion> {
        let conversion = self.get_conversion(id).await?;

        if conversion.status != ConversionStatus::Pending.as_str() {
            return Err(DomainError::business_rule(
                "Conversion",
                "Only pending conversions can be approved",
            ));
        }

        self.conversion_repo.approve(id, approved_by).await
    }

    /// Reject a conversion request
    pub async fn reject_conversion(
        &self,
        id: Uuid,
        rejected_by: Uuid,
        reason: &str,
    ) -> DomainResult<AssetConversion> {
        let conversion = self.get_conversion(id).await?;

        if conversion.status != ConversionStatus::Pending.as_str() {
            return Err(DomainError::business_rule(
                "Conversion",
                "Only pending conversions can be rejected",
            ));
        }

        self.conversion_repo.reject(id, rejected_by, reason).await
    }

    /// Execute an approved conversion
    pub async fn execute_conversion(
        &self,
        id: Uuid,
        executed_by: Uuid,
    ) -> DomainResult<AssetConversion> {
        let conversion = self.get_conversion(id).await?;

        if conversion.status != ConversionStatus::Approved.as_str() {
            return Err(DomainError::business_rule(
                "Conversion",
                "Only approved conversions can be executed",
            ));
        }

        // Transition asset to UnderConversion state
        self.lifecycle_repo
            .update_asset_status(conversion.asset_id, AssetState::UnderConversion.as_str())
            .await?;

        // Record transition in history
        let current_state = AssetState::Deployed; // Assumed from validation
        self.lifecycle_repo
            .record_transition(
                conversion.asset_id,
                &current_state,
                &AssetState::UnderConversion,
                Some(format!(
                    "Conversion started: {} → {}",
                    conversion.from_subtype.as_deref().unwrap_or("N/A"),
                    conversion.to_subtype.as_deref().unwrap_or("N/A")
                )),
                Some(executed_by),
                None,
            )
            .await?;

        // Mark conversion as in progress
        self.conversion_repo.start_execution(id).await
    }

    /// Complete a conversion and return asset to deployed
    pub async fn complete_conversion(
        &self,
        id: Uuid,
        completed_by: Uuid,
    ) -> DomainResult<AssetConversion> {
        let conversion = self.get_conversion(id).await?;

        if conversion.status != ConversionStatus::InProgress.as_str() {
            return Err(DomainError::business_rule(
                "Conversion",
                "Only in-progress conversions can be completed",
            ));
        }

        // Transition asset back to Deployed state
        self.lifecycle_repo
            .update_asset_status(conversion.asset_id, AssetState::Deployed.as_str())
            .await?;

        // Record transition in history
        self.lifecycle_repo
            .record_transition(
                conversion.asset_id,
                &AssetState::UnderConversion,
                &AssetState::Deployed,
                Some(format!(
                    "Conversion completed: {} → {}",
                    conversion.from_subtype.as_deref().unwrap_or("N/A"),
                    conversion.to_subtype.as_deref().unwrap_or("N/A")
                )),
                Some(completed_by),
                None,
            )
            .await?;

        // TODO: Update asset specifications based on new_specifications

        // Mark conversion as completed
        self.conversion_repo.complete(id, completed_by).await
    }
}
