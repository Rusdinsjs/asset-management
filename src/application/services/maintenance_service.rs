//! Maintenance Service

use uuid::Uuid;

use crate::application::dto::{CreateMaintenanceRequest, UpdateMaintenanceRequest};
use crate::domain::entities::{MaintenanceRecord, MaintenanceSummary};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::MaintenanceRepository;

#[derive(Clone)]
pub struct MaintenanceService {
    repository: MaintenanceRepository,
}

impl MaintenanceService {
    pub fn new(repository: MaintenanceRepository) -> Self {
        Self { repository }
    }

    pub async fn list(&self, page: i64, per_page: i64) -> DomainResult<Vec<MaintenanceSummary>> {
        let offset = (page - 1) * per_page;
        self.repository.list(per_page, offset).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    pub async fn list_by_asset(&self, asset_id: Uuid) -> DomainResult<Vec<MaintenanceSummary>> {
        self.repository.list_by_asset(asset_id).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    pub async fn list_overdue(&self) -> DomainResult<Vec<MaintenanceSummary>> {
        self.repository
            .list_overdue()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn get_by_id(&self, id: Uuid) -> DomainResult<MaintenanceRecord> {
        self.repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("MaintenanceRecord", id))
    }

    pub async fn create(
        &self,
        request: CreateMaintenanceRequest,
    ) -> DomainResult<MaintenanceRecord> {
        let mut record = MaintenanceRecord::new(request.asset_id);
        record.maintenance_type_id = request.maintenance_type_id;
        record.scheduled_date = request.scheduled_date;
        record.description = request.description;
        record.cost = request.cost;
        record.vendor_id = request.vendor_id;

        self.repository
            .create(&record)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn update(
        &self,
        id: Uuid,
        request: UpdateMaintenanceRequest,
    ) -> DomainResult<MaintenanceRecord> {
        let mut record = self.get_by_id(id).await?;

        if let Some(t) = request.maintenance_type_id {
            record.maintenance_type_id = Some(t);
        }
        if let Some(d) = request.scheduled_date {
            record.scheduled_date = Some(d);
        }
        if let Some(d) = request.actual_date {
            record.actual_date = Some(d);
        }
        if let Some(d) = request.description {
            record.description = Some(d);
        }
        if let Some(f) = request.findings {
            record.findings = Some(f);
        }
        if let Some(a) = request.actions_taken {
            record.actions_taken = Some(a);
        }
        if let Some(c) = request.cost {
            record.cost = Some(c);
        }
        if let Some(p) = request.performed_by {
            record.performed_by = Some(p);
        }
        if let Some(v) = request.vendor_id {
            record.vendor_id = Some(v);
        }
        if let Some(s) = request.status {
            record.status = s;
        }
        if let Some(n) = request.next_service_date {
            record.next_service_date = Some(n);
        }

        self.repository
            .update(&record)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn delete(&self, id: Uuid) -> DomainResult<bool> {
        self.repository
            .delete(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    /// Check upcoming maintenance (Background Task)
    pub async fn check_upcoming_maintenance(&self) -> DomainResult<()> {
        // Placeholder for background logic
        Ok(())
    }
}
