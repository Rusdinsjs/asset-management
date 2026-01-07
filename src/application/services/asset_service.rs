//! Asset Service

use uuid::Uuid;

use crate::application::dto::{
    AssetSearchParams, CreateAssetRequest, PaginatedResponse, UpdateAssetRequest,
};
use crate::domain::entities::{Asset, AssetHistory, AssetState, AssetSummary};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::AssetRepository;

/// Asset service for business logic
#[derive(Clone)]
pub struct AssetService {
    repository: AssetRepository,
}

impl AssetService {
    pub fn new(repository: AssetRepository) -> Self {
        Self { repository }
    }

    /// List assets with pagination
    pub async fn list(
        &self,
        page: i64,
        per_page: i64,
    ) -> DomainResult<PaginatedResponse<AssetSummary>> {
        let offset = (page - 1) * per_page;
        let assets = self.repository.list(per_page, offset).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })?;

        let total =
            self.repository
                .count()
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        Ok(PaginatedResponse::new(assets, total, page, per_page))
    }

    /// Get asset by ID
    pub async fn get_by_id(&self, id: Uuid) -> DomainResult<Asset> {
        self.repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("Asset", id))
    }

    /// Search assets
    pub async fn search(
        &self,
        params: AssetSearchParams,
    ) -> DomainResult<PaginatedResponse<AssetSummary>> {
        let page = params.page.unwrap_or(1).max(1);
        let per_page = params.per_page.unwrap_or(20).clamp(1, 100);
        let offset = (page - 1) * per_page;

        let assets = self
            .repository
            .search(
                params.query.as_deref().unwrap_or(""),
                params.category_id,
                params.location_id,
                params.status.as_deref(),
                per_page,
                offset,
            )
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        let total =
            self.repository
                .count()
                .await
                .map_err(|e| DomainError::ExternalServiceError {
                    service: "database".to_string(),
                    message: e.to_string(),
                })?;

        Ok(PaginatedResponse::new(assets, total, page, per_page))
    }

    /// Create new asset
    pub async fn create(&self, request: CreateAssetRequest) -> DomainResult<Asset> {
        // Check if code already exists
        if let Some(_) = self
            .repository
            .find_by_code(&request.asset_code)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
        {
            return Err(DomainError::conflict("Asset code already exists"));
        }

        let mut asset = Asset::new(request.asset_code, request.name, request.category_id);

        // Set optional fields
        asset.location_id = request.location_id;
        asset.department_id = request.department_id;
        asset.assigned_to = request.assigned_to;
        asset.vendor_id = request.vendor_id;
        asset.is_rental = request.is_rental.unwrap_or(false);
        asset.asset_class = request.asset_class;
        asset.condition_id = request.condition_id;
        asset.serial_number = request.serial_number;
        asset.brand = request.brand;
        asset.model = request.model;
        asset.year_manufacture = request.year_manufacture;
        asset.specifications = request.specifications;
        asset.purchase_date = request.purchase_date;
        asset.purchase_price = request.purchase_price;
        asset.currency_id = request.currency_id;
        asset.unit_id = request.unit_id;
        asset.quantity = request.quantity;
        asset.residual_value = request.residual_value;
        asset.useful_life_months = request.useful_life_months;
        asset.notes = request.notes;

        self.repository
            .create(&asset)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Update asset
    pub async fn update(&self, id: Uuid, request: UpdateAssetRequest) -> DomainResult<Asset> {
        let mut asset = self.get_by_id(id).await?;

        // Update fields if provided
        if let Some(code) = request.asset_code {
            asset.asset_code = code;
        }
        if let Some(name) = request.name {
            asset.name = name;
        }
        if let Some(cat) = request.category_id {
            asset.category_id = cat;
        }
        if let Some(loc) = request.location_id {
            asset.location_id = Some(loc);
        }
        if let Some(dept) = request.department_id {
            asset.department_id = Some(dept);
        }
        if let Some(user) = request.assigned_to {
            asset.assigned_to = Some(user);
        }
        if let Some(v) = request.vendor_id {
            asset.vendor_id = Some(v);
        }
        if let Some(r) = request.is_rental {
            asset.is_rental = r;
        }
        if let Some(c) = request.asset_class {
            asset.asset_class = Some(c);
        }
        if let Some(s) = request.status {
            asset.status = s;
        }
        if let Some(c) = request.condition_id {
            asset.condition_id = Some(c);
        }
        if let Some(s) = request.serial_number {
            asset.serial_number = Some(s);
        }
        if let Some(b) = request.brand {
            asset.brand = Some(b);
        }
        if let Some(m) = request.model {
            asset.model = Some(m);
        }
        if let Some(y) = request.year_manufacture {
            asset.year_manufacture = Some(y);
        }
        if let Some(s) = request.specifications {
            asset.specifications = Some(s);
        }
        if let Some(d) = request.purchase_date {
            asset.purchase_date = Some(d);
        }
        if let Some(p) = request.purchase_price {
            asset.purchase_price = Some(p);
        }
        if let Some(c) = request.currency_id {
            asset.currency_id = Some(c);
        }
        if let Some(u) = request.unit_id {
            asset.unit_id = Some(u);
        }
        if let Some(q) = request.quantity {
            asset.quantity = Some(q);
        }
        if let Some(r) = request.residual_value {
            asset.residual_value = Some(r);
        }
        if let Some(u) = request.useful_life_months {
            asset.useful_life_months = Some(u);
        }
        if let Some(n) = request.notes {
            asset.notes = Some(n);
        }

        self.repository
            .update(&asset)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Change asset state
    pub async fn change_state(
        &self,
        id: Uuid,
        new_state: &str,
        performed_by: Option<Uuid>,
    ) -> DomainResult<Asset> {
        let asset = self.get_by_id(id).await?;

        let current = AssetState::from_str(&asset.status)
            .ok_or_else(|| DomainError::validation("status", "Invalid current state"))?;

        let target = AssetState::from_str(new_state)
            .ok_or_else(|| DomainError::validation("new_state", "Invalid target state"))?;

        if !current.can_transition_to(&target) {
            return Err(DomainError::invalid_transition(&asset.status, new_state));
        }

        self.repository
            .update_status(id, new_state)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        // Add history entry
        let history =
            AssetHistory::new(id, &format!("state_changed_to_{}", new_state), performed_by);
        let _ = self.repository.add_history(&history).await;

        self.get_by_id(id).await
    }

    /// Delete asset
    pub async fn delete(&self, id: Uuid) -> DomainResult<bool> {
        self.repository
            .delete(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Get asset history
    pub async fn get_history(&self, id: Uuid) -> DomainResult<Vec<AssetHistory>> {
        self.repository
            .get_history(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}
