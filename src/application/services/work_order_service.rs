//! Work Order Service

use chrono::NaiveDate;
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::domain::entities::{ChecklistItem, WorkOrder, WorkOrderStatus};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::WorkOrderRepository;

/// Create work order request
#[derive(Debug, serde::Deserialize)]
pub struct CreateWorkOrderRequest {
    pub asset_id: Uuid,
    pub wo_type: String,
    pub priority: Option<String>,
    pub scheduled_date: Option<NaiveDate>,
    pub due_date: Option<NaiveDate>,
    pub problem_description: Option<String>,
    pub estimated_hours: Option<Decimal>,
    pub estimated_cost: Option<Decimal>,
    pub safety_requirements: Option<Vec<String>>,
    pub lockout_tagout_required: Option<bool>,
}

#[derive(Clone)]
pub struct WorkOrderService {
    repository: WorkOrderRepository,
}

impl WorkOrderService {
    pub fn new(repository: WorkOrderRepository) -> Self {
        Self { repository }
    }

    pub async fn create(
        &self,
        request: CreateWorkOrderRequest,
        created_by: Option<Uuid>,
    ) -> DomainResult<WorkOrder> {
        let mut wo = WorkOrder::new(request.asset_id, &request.wo_type);
        wo.priority = request.priority;
        wo.scheduled_date = request.scheduled_date;
        wo.due_date = request.due_date;
        wo.problem_description = request.problem_description;
        wo.estimated_hours = request.estimated_hours;
        wo.estimated_cost = request.estimated_cost;
        wo.safety_requirements = request.safety_requirements;
        wo.lockout_tagout_required = request.lockout_tagout_required.unwrap_or(false);
        wo.created_by = created_by;

        self.repository
            .create(&wo)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn get_by_id(&self, id: Uuid) -> DomainResult<WorkOrder> {
        self.repository
            .find_by_id(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::not_found("WorkOrder", id))
    }

    pub async fn list(&self, page: i64, per_page: i64) -> DomainResult<Vec<WorkOrder>> {
        let offset = (page - 1) * per_page;
        self.repository.list(per_page, offset).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    pub async fn list_by_asset(&self, asset_id: Uuid) -> DomainResult<Vec<WorkOrder>> {
        self.repository.list_by_asset(asset_id).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })
    }

    pub async fn list_pending(&self) -> DomainResult<Vec<WorkOrder>> {
        self.repository
            .list_pending()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn list_overdue(&self) -> DomainResult<Vec<WorkOrder>> {
        self.repository
            .list_overdue()
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn list_by_technician(&self, technician_id: Uuid) -> DomainResult<Vec<WorkOrder>> {
        self.repository
            .list_by_technician(technician_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn approve(&self, id: Uuid, _approved_by: Uuid) -> DomainResult<WorkOrder> {
        let wo = self.get_by_id(id).await?;

        if wo.status != WorkOrderStatus::Pending.as_str() {
            return Err(DomainError::business_rule(
                "work_order_status",
                "Can only approve pending work orders",
            ));
        }

        self.repository
            .update_status(id, "approved")
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        self.get_by_id(id).await
    }

    pub async fn assign(&self, id: Uuid, technician_id: Uuid) -> DomainResult<WorkOrder> {
        self.repository
            .assign_technician(id, technician_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        self.get_by_id(id).await
    }

    pub async fn start_work(&self, id: Uuid) -> DomainResult<WorkOrder> {
        self.repository
            .start_work(id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        self.get_by_id(id).await
    }

    pub async fn complete(
        &self,
        id: Uuid,
        completed_by: Uuid,
        work_performed: &str,
        actual_cost: Option<Decimal>,
    ) -> DomainResult<WorkOrder> {
        self.repository
            .complete(id, completed_by, work_performed, actual_cost)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?;

        self.get_by_id(id).await
    }

    // Checklist methods
    pub async fn get_checklist(&self, work_order_id: Uuid) -> DomainResult<Vec<ChecklistItem>> {
        self.repository
            .get_checklists(work_order_id)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn add_checklist_item(
        &self,
        work_order_id: Uuid,
        task_number: i32,
        description: String,
    ) -> DomainResult<ChecklistItem> {
        let item = ChecklistItem::new(work_order_id, task_number, description);
        self.repository
            .add_checklist_item(&item)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }

    pub async fn complete_checklist_item(
        &self,
        id: Uuid,
        completed_by: Uuid,
        result: &str,
    ) -> DomainResult<bool> {
        self.repository
            .complete_checklist_item(id, completed_by, result)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}
