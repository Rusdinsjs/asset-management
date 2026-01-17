use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::{AssetRepository, MaintenanceRepository};
use chrono::NaiveDate;

#[derive(Clone)]
pub struct ReportService {
    asset_repo: AssetRepository,
    maintenance_repo: MaintenanceRepository,
    rental_repo: crate::infrastructure::repositories::RentalRepository,
    timesheet_repo: crate::infrastructure::repositories::TimesheetRepository,
}

impl ReportService {
    pub fn new(
        asset_repo: AssetRepository,
        maintenance_repo: MaintenanceRepository,
        rental_repo: crate::infrastructure::repositories::RentalRepository,
        timesheet_repo: crate::infrastructure::repositories::TimesheetRepository,
    ) -> Self {
        Self {
            asset_repo,
            maintenance_repo,
            rental_repo,
            timesheet_repo,
        }
    }

    pub async fn generate_asset_inventory_csv(&self) -> DomainResult<String> {
        let assets = self
            .asset_repo
            .find_all()
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        let mut wtr = csv::Writer::from_writer(vec![]);

        // Header
        wtr.write_record(&[
            "ID",
            "Code",
            "Name",
            "Status",
            "Class",
            "Brand",
            "Model",
            "Serial Number",
            "Purchase Date",
            "Purchase Price",
            "Condition",
        ])
        .map_err(|e| DomainError::internal(e.to_string()))?;

        for asset in assets {
            wtr.write_record(&[
                asset.id.to_string(),
                asset.asset_code,
                asset.name,
                asset.status,
                asset.asset_class.unwrap_or_default(),
                asset.brand.unwrap_or_default(),
                asset.model.unwrap_or_default(),
                asset.serial_number.unwrap_or_default(),
                asset
                    .purchase_date
                    .map(|d| d.to_string())
                    .unwrap_or_default(),
                asset
                    .purchase_price
                    .map(|d| d.to_string())
                    .unwrap_or_default(),
                asset
                    .condition_id
                    .map(|c| c.to_string())
                    .unwrap_or_default(),
            ])
            .map_err(|e| DomainError::internal(e.to_string()))?;
        }

        let data = String::from_utf8(
            wtr.into_inner()
                .map_err(|e| DomainError::internal(e.to_string()))?,
        )
        .map_err(|e| DomainError::internal(e.to_string()))?;

        Ok(data)
    }

    pub async fn generate_maintenance_log_csv(
        &self,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> DomainResult<String> {
        let logs = self
            .maintenance_repo
            .find_by_date_range(start_date, end_date)
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        let mut wtr = csv::Writer::from_writer(vec![]);

        // Header
        wtr.write_record(&[
            "Date",
            "Asset Name",
            "Maintenance Type",
            "Status",
            "Cost",
            "Actual Date",
        ])
        .map_err(|e| DomainError::internal(e.to_string()))?;

        for log in logs {
            wtr.write_record(&[
                log.scheduled_date
                    .map(|d| d.to_string())
                    .unwrap_or_default(),
                log.asset_name.unwrap_or_default(),
                log.type_name.unwrap_or_default(),
                log.status,
                log.cost.map(|c| c.to_string()).unwrap_or_default(),
                log.actual_date.map(|d| d.to_string()).unwrap_or_default(),
            ])
            .map_err(|e| DomainError::internal(e.to_string()))?;
        }

        let data = String::from_utf8(
            wtr.into_inner()
                .map_err(|e| DomainError::internal(e.to_string()))?,
        )
        .map_err(|e| DomainError::internal(e.to_string()))?;

        Ok(data)
    }

    pub async fn generate_rental_revenue_csv(
        &self,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> DomainResult<String> {
        // Query billing periods within date range
        let periods = sqlx::query!(
            r#"SELECT 
                bp.*,
                r.rental_number,
                a.name as asset_name,
                c.name as client_name
            FROM rental_billing_periods bp
            JOIN rentals r ON bp.rental_id = r.id
            JOIN assets a ON r.asset_id = a.id
            JOIN clients c ON r.client_id = c.id
            WHERE bp.period_start >= $1 AND bp.period_end <= $2
            AND bp.status IN ('approved', 'invoiced', 'paid')
            ORDER BY bp.period_start ASC"#,
            start_date,
            end_date
        )
        .fetch_all(self.rental_repo.pool())
        .await
        .map_err(|e| DomainError::internal(e.to_string()))?;

        let mut wtr = csv::Writer::from_writer(vec![]);

        // Header
        wtr.write_record(&[
            "Period Start",
            "Period End",
            "Rental No",
            "Client",
            "Asset",
            "Op Hours",
            "Base Amount",
            "Tax",
            "Total Amount",
            "Status",
            "Invoice No",
        ])
        .map_err(|e| DomainError::internal(e.to_string()))?;

        for p in periods {
            wtr.write_record(&[
                p.period_start.to_string(),
                p.period_end.to_string(),
                p.rental_number,
                p.client_name,
                p.asset_name,
                p.total_operating_hours
                    .map(|d| d.to_string())
                    .unwrap_or_default(),
                p.base_amount.map(|d| d.to_string()).unwrap_or_default(),
                p.tax_amount.map(|d| d.to_string()).unwrap_or_default(),
                p.total_amount.map(|d| d.to_string()).unwrap_or_default(),
                p.status.unwrap_or_default(),
                p.invoice_number.unwrap_or_default(),
            ])
            .map_err(|e| DomainError::internal(e.to_string()))?;
        }

        let data = String::from_utf8(
            wtr.into_inner()
                .map_err(|e| DomainError::internal(e.to_string()))?,
        )
        .map_err(|e| DomainError::internal(e.to_string()))?;

        Ok(data)
    }

    pub async fn generate_asset_depreciation_csv(&self) -> DomainResult<String> {
        let assets = self
            .asset_repo
            .find_all()
            .await
            .map_err(|e| DomainError::internal(e.to_string()))?;

        let mut wtr = csv::Writer::from_writer(vec![]);

        // Header
        wtr.write_record(&[
            "Asset Code",
            "Name",
            "Purchase Date",
            "Purchase Price",
            "Useful Life (Months)",
            "Residual Value",
            "Current Book Value",
        ])
        .map_err(|e| DomainError::internal(e.to_string()))?;

        for asset in assets {
            // Only include assets with financial data
            if asset.purchase_price.is_some() && asset.useful_life_months.is_some() {
                let book_value = asset.calculate_book_value();

                wtr.write_record(&[
                    asset.asset_code,
                    asset.name,
                    asset
                        .purchase_date
                        .map(|d| d.to_string())
                        .unwrap_or_default(),
                    asset
                        .purchase_price
                        .map(|d| d.to_string())
                        .unwrap_or_default(),
                    asset
                        .useful_life_months
                        .map(|d| d.to_string())
                        .unwrap_or_default(),
                    asset
                        .residual_value
                        .map(|d| d.to_string())
                        .unwrap_or_default(),
                    book_value.map(|d| d.to_string()).unwrap_or_default(),
                ])
                .map_err(|e| DomainError::internal(e.to_string()))?;
            }
        }

        let data = String::from_utf8(
            wtr.into_inner()
                .map_err(|e| DomainError::internal(e.to_string()))?,
        )
        .map_err(|e| DomainError::internal(e.to_string()))?;

        Ok(data)
    }
}
