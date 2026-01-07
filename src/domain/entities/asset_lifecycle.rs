//! Asset Lifecycle State Machine
//!
//! Defines the possible states of an asset and valid transitions between states.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Asset lifecycle states
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum AssetState {
    #[default]
    Planning,
    Procurement,
    Received,
    InInventory,
    Deployed,
    UnderMaintenance,
    UnderRepair,
    Retired,
    Disposed,
    LostStolen,
    Archived,
}

impl AssetState {
    /// Get the string representation of the state
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Planning => "planning",
            Self::Procurement => "procurement",
            Self::Received => "received",
            Self::InInventory => "in_inventory",
            Self::Deployed => "deployed",
            Self::UnderMaintenance => "under_maintenance",
            Self::UnderRepair => "under_repair",
            Self::Retired => "retired",
            Self::Disposed => "disposed",
            Self::LostStolen => "lost_stolen",
            Self::Archived => "archived",
        }
    }

    /// Parse state from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "planning" => Some(Self::Planning),
            "procurement" => Some(Self::Procurement),
            "received" => Some(Self::Received),
            "in_inventory" => Some(Self::InInventory),
            "deployed" => Some(Self::Deployed),
            "under_maintenance" => Some(Self::UnderMaintenance),
            "under_repair" => Some(Self::UnderRepair),
            "retired" => Some(Self::Retired),
            "disposed" => Some(Self::Disposed),
            "lost_stolen" => Some(Self::LostStolen),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }

    /// Check if a transition to the target state is valid
    pub fn can_transition_to(&self, target: &AssetState) -> bool {
        // Special case: Any state can transition to LostStolen
        if *target == Self::LostStolen {
            return true;
        }

        match self {
            Self::Planning => matches!(target, Self::Procurement),
            Self::Procurement => matches!(target, Self::Received),
            Self::Received => matches!(target, Self::InInventory),
            Self::InInventory => matches!(target, Self::Deployed),
            Self::Deployed => matches!(
                target,
                Self::UnderMaintenance | Self::UnderRepair | Self::Retired
            ),
            Self::UnderMaintenance => matches!(target, Self::Deployed),
            Self::UnderRepair => matches!(target, Self::Deployed),
            Self::Retired => matches!(target, Self::Disposed),
            Self::Disposed => false,
            Self::LostStolen => matches!(target, Self::Archived),
            Self::Archived => false,
        }
    }

    /// Get all valid transitions from this state
    pub fn valid_transitions(&self) -> Vec<AssetState> {
        let mut transitions = vec![Self::LostStolen]; // Always available

        match self {
            Self::Planning => transitions.push(Self::Procurement),
            Self::Procurement => transitions.push(Self::Received),
            Self::Received => transitions.push(Self::InInventory),
            Self::InInventory => transitions.push(Self::Deployed),
            Self::Deployed => {
                transitions.extend([Self::UnderMaintenance, Self::UnderRepair, Self::Retired]);
            }
            Self::UnderMaintenance => transitions.push(Self::Deployed),
            Self::UnderRepair => transitions.push(Self::Deployed),
            Self::Retired => transitions.push(Self::Disposed),
            Self::LostStolen => transitions.push(Self::Archived),
            Self::Disposed | Self::Archived => {
                transitions.clear(); // No transitions from terminal states
            }
        }

        transitions
    }

    /// Check if this is a terminal state (no further transitions possible)
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Disposed | Self::Archived)
    }

    /// Check if asset is actively in use
    pub fn is_active(&self) -> bool {
        matches!(
            self,
            Self::InInventory | Self::Deployed | Self::UnderMaintenance | Self::UnderRepair
        )
    }

    /// Get display name for UI
    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Planning => "Planning",
            Self::Procurement => "Procurement",
            Self::Received => "Received",
            Self::InInventory => "In Inventory",
            Self::Deployed => "Deployed",
            Self::UnderMaintenance => "Under Maintenance",
            Self::UnderRepair => "Under Repair",
            Self::Retired => "Retired",
            Self::Disposed => "Disposed",
            Self::LostStolen => "Lost/Stolen",
            Self::Archived => "Archived",
        }
    }

    /// Get color for UI display
    pub fn color(&self) -> &'static str {
        match self {
            Self::Planning => "gray",
            Self::Procurement => "blue",
            Self::Received => "cyan",
            Self::InInventory => "green",
            Self::Deployed => "emerald",
            Self::UnderMaintenance => "yellow",
            Self::UnderRepair => "orange",
            Self::Retired => "slate",
            Self::Disposed => "neutral",
            Self::LostStolen => "red",
            Self::Archived => "zinc",
        }
    }
}

impl fmt::Display for AssetState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.display_name())
    }
}

/// State transition event for audit logging
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateTransition {
    pub from_state: AssetState,
    pub to_state: AssetState,
    pub reason: Option<String>,
    pub performed_by: Option<uuid::Uuid>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl StateTransition {
    pub fn new(
        from_state: AssetState,
        to_state: AssetState,
        reason: Option<String>,
        performed_by: Option<uuid::Uuid>,
    ) -> Self {
        Self {
            from_state,
            to_state,
            reason,
            performed_by,
            timestamp: chrono::Utc::now(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_transitions() {
        assert!(AssetState::Planning.can_transition_to(&AssetState::Procurement));
        assert!(AssetState::Deployed.can_transition_to(&AssetState::UnderMaintenance));
        assert!(AssetState::UnderMaintenance.can_transition_to(&AssetState::Deployed));
    }

    #[test]
    fn test_invalid_transitions() {
        assert!(!AssetState::Planning.can_transition_to(&AssetState::Deployed));
        assert!(!AssetState::Disposed.can_transition_to(&AssetState::Deployed));
    }

    #[test]
    fn test_lost_stolen_from_any_state() {
        assert!(AssetState::Planning.can_transition_to(&AssetState::LostStolen));
        assert!(AssetState::Deployed.can_transition_to(&AssetState::LostStolen));
        assert!(AssetState::Retired.can_transition_to(&AssetState::LostStolen));
    }

    #[test]
    fn test_terminal_states() {
        assert!(AssetState::Disposed.is_terminal());
        assert!(AssetState::Archived.is_terminal());
        assert!(!AssetState::Deployed.is_terminal());
    }
}
