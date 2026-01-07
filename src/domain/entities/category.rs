//! Category Entity
//!
//! Hierarchical categories for asset classification with custom attributes per category.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::FromRow;
use uuid::Uuid;

/// Asset Category - hierarchical structure
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Category {
    pub id: Uuid,
    pub parent_id: Option<Uuid>,
    pub code: String,
    pub name: String,
    pub description: Option<String>,

    // Depreciation settings per category
    pub depreciation_method: Option<String>,
    pub depreciation_period: Option<i32>, // in months
    pub residual_rate: Option<rust_decimal::Decimal>,

    // Custom attributes schema for this category
    pub attributes_schema: Option<JsonValue>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Category {
    pub fn new(code: String, name: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            parent_id: None,
            code,
            name,
            description: None,
            depreciation_method: Some("straight_line".to_string()),
            depreciation_period: None,
            residual_rate: None,
            attributes_schema: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// Create a child category
    pub fn child(parent_id: Uuid, code: String, name: String) -> Self {
        let mut category = Self::new(code, name);
        category.parent_id = Some(parent_id);
        category
    }

    /// Check if this is a root category
    pub fn is_root(&self) -> bool {
        self.parent_id.is_none()
    }
}

/// Category tree node for hierarchical display
#[derive(Debug, Clone, Serialize)]
pub struct CategoryNode {
    #[serde(flatten)]
    pub category: Category,
    pub children: Vec<CategoryNode>,
    pub level: u32,
    pub full_path: String,
}

impl CategoryNode {
    pub fn from_category(category: Category, level: u32, parent_path: &str) -> Self {
        let full_path = if parent_path.is_empty() {
            category.name.clone()
        } else {
            format!("{} > {}", parent_path, category.name)
        };

        Self {
            category,
            children: Vec::new(),
            level,
            full_path,
        }
    }
}
