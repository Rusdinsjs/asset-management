import { api } from './client';

export interface MaintenanceSummary {
    id: string;
    asset_id: string;
    maintenance_type_id?: number;
    scheduled_date?: string;
    actual_date?: string;
    status: string;
    cost?: number;
    asset_name?: string;
    type_name?: string;
}

export interface MaintenanceRecord {
    id: string;
    asset_id: string;
    maintenance_type_id?: number;
    scheduled_date?: string;
    actual_date?: string;
    description?: string;
    findings?: string;
    actions_taken?: string;
    cost?: number;
    currency_id?: number;
    performed_by?: string;
    vendor_id?: string;
    assigned_to?: string;
    status: string;
    approval_status: string; // not_required, pending_approval, approved, rejected
    cost_threshold_exceeded: boolean;
    next_service_date?: string;
    odometer_reading?: number;
    created_by?: string;
    created_at: string;
    updated_at: string;
    asset_name?: string;
    type_name?: string;
}

export interface MaintenanceSearchParams {
    asset_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    page: number;
    per_page: number;
}

export interface CreateMaintenanceRequest {
    asset_id: string;
    maintenance_type_id?: number;
    scheduled_date?: string;
    description?: string;
    cost?: number;
    vendor_id?: string;
    assigned_to?: string;
}

export interface UpdateMaintenanceRequest {
    maintenance_type_id?: number;
    scheduled_date?: string;
    actual_date?: string;
    description?: string;
    findings?: string;
    actions_taken?: string;
    cost?: number;
    performed_by?: string;
    vendor_id?: string;
    assigned_to?: string;
    status?: string;
    next_service_date?: string;
    odometer_reading?: number;
}

export const maintenanceApi = {
    list: async (params: MaintenanceSearchParams) => {
        const response = await api.get('/maintenance', { params });
        return response.data;
    },
    listOverdue: async () => {
        const response = await api.get('/maintenance/overdue');
        return response.data;
    },
    get: async (id: string): Promise<{ data: MaintenanceRecord; success: boolean }> => {
        const response = await api.get(`/maintenance/${id}`);
        return response.data;
    },
    create: async (data: CreateMaintenanceRequest) => {
        const response = await api.post('/maintenance', data);
        return response.data;
    },
    update: async (id: string, data: UpdateMaintenanceRequest) => {
        const response = await api.put(`/maintenance/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/maintenance/${id}`);
        return response.data;
    },
};
