//! Lifecycle Service
//!
//! Business logic for asset lifecycle state transitions.

use uuid::Uuid;

use crate::domain::entities::{AssetState, LifecycleHistory};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::LifecycleRepository;

#[derive(Clone)]
pub struct LifecycleService {
    repository: LifecycleRepository,
}

impl LifecycleService {
    pub fn new(repository: LifecycleRepository) -> Self {
        Self { repository }
    }

    /// Transition an asset to a new state with validation
    pub async fn transition_asset(
        &self,
        asset_id: Uuid,
        target_state: &str,
        reason: Option<String>,
        performed_by: Option<Uuid>,
    ) -> DomainResult<LifecycleHistory> {
        // Get current status
        let current_status = self.repository.get_asset_status(asset_id).await?;

        // Parse states
        let current_state = AssetState::from_str(&current_status).ok_or_else(|| {
            DomainError::bad_request(&format!("Invalid current state: {}", current_status))
        })?;

        let new_state = AssetState::from_str(target_state).ok_or_else(|| {
            DomainError::bad_request(&format!("Invalid target state: {}", target_state))
        })?;

        // Validate transition
        if !current_state.can_transition_to(&new_state) {
            return Err(DomainError::business_rule(
                "Lifecycle",
                &format!(
                    "Cannot transition from {} to {}. Valid transitions: {:?}",
                    current_state.display_name(),
                    new_state.display_name(),
                    current_state
                        .valid_transitions()
                        .iter()
                        .map(|s| s.display_name())
                        .collect::<Vec<_>>()
                ),
            ));
        }

        // Update asset status
        self.repository
            .update_asset_status(asset_id, new_state.as_str())
            .await?;

        // Record in history
        let history = self
            .repository
            .record_transition(
                asset_id,
                &current_state,
                &new_state,
                reason,
                performed_by,
                None,
            )
            .await?;

        Ok(history)
    }

    /// Get valid transitions for an asset
    pub async fn get_valid_transitions(&self, asset_id: Uuid) -> DomainResult<Vec<AssetState>> {
        let current_status = self.repository.get_asset_status(asset_id).await?;

        let current_state = AssetState::from_str(&current_status).ok_or_else(|| {
            DomainError::bad_request(&format!("Invalid state: {}", current_status))
        })?;

        Ok(current_state.valid_transitions())
    }

    /// Get lifecycle history for an asset
    pub async fn get_history(&self, asset_id: Uuid) -> DomainResult<Vec<LifecycleHistory>> {
        self.repository.get_history(asset_id).await
    }

    /// Get all available states with metadata
    pub fn get_all_states() -> Vec<StateInfo> {
        vec![
            AssetState::Planning,
            AssetState::Procurement,
            AssetState::Received,
            AssetState::InInventory,
            AssetState::Deployed,
            AssetState::UnderMaintenance,
            AssetState::UnderRepair,
            AssetState::UnderConversion,
            AssetState::Retired,
            AssetState::Disposed,
            AssetState::LostStolen,
            AssetState::Archived,
        ]
        .into_iter()
        .map(|s| StateInfo {
            value: s.as_str().to_string(),
            label: s.display_name().to_string(),
            color: s.color().to_string(),
            is_terminal: s.is_terminal(),
        })
        .collect()
    }
}

/// State information for frontend
#[derive(Debug, Clone, serde::Serialize)]
pub struct StateInfo {
    pub value: String,
    pub label: String,
    pub color: String,
    pub is_terminal: bool,
}
