import { api } from './client';
import type { ApiResponse } from './maintenance';

export interface WorkOrder {
    id: string;
    wo_number: string;
    asset_id: string;
    wo_type: string;
    priority: string;
    status: string;
    scheduled_date?: string;
    due_date?: string;
    actual_start_date?: string;
    actual_end_date?: string;
    assigned_technician?: string;
    estimated_cost?: number; // In Decimal from backend, number in JS
    actual_cost?: number;
    parts_cost?: number;
    labor_cost?: number;
    problem_description?: string;
    work_performed?: string;
    recommendations?: string;
    safety_requirements?: string[];
    created_at: string;
    updated_at: string;
}

export interface ChecklistItem {
    id: string;
    work_order_id: string;
    task_number: number;
    description: string;
    status: string; // pending, completed
    completed_by?: string;
    completed_at?: string;
    photos?: string[];
}

export interface WorkOrderPart {
    id: string;
    work_order_id: string;
    part_name: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    added_at: string;
}

export interface AddTaskRequest {
    task_number: number;
    description: string;
}

export interface AddPartRequest {
    part_name: string;
    quantity: number;
    unit_cost: number;
}

export const workOrderApi = {
    get: async (id: string): Promise<WorkOrder> => {
        const response = await api.get(`/work-orders/${id}`);
        // Backend returns the object directly
        return response.data;
    },

    // Tasks
    getTasks: async (id: string): Promise<ChecklistItem[]> => {
        const response = await api.get(`/work-orders/${id}/tasks`);
        return response.data;
    },
    addTask: async (id: string, data: AddTaskRequest): Promise<ChecklistItem> => {
        const response = await api.post(`/work-orders/${id}/tasks`, data);
        return response.data;
    },
    removeTask: async (id: string, taskId: string): Promise<ApiResponse<boolean>> => {
        const response = await api.delete(`/work-orders/${id}/tasks/${taskId}`);
        return response.data;
    },

    // Parts
    getParts: async (id: string): Promise<WorkOrderPart[]> => {
        const response = await api.get(`/work-orders/${id}/parts`);
        return response.data;
    },
    addPart: async (id: string, data: AddPartRequest): Promise<WorkOrderPart> => {
        const response = await api.post(`/work-orders/${id}/parts`, data);
        return response.data;
    },
    removePart: async (id: string, partId: string): Promise<ApiResponse<boolean>> => {
        const response = await api.delete(`/work-orders/${id}/parts/${partId}`);
        return response.data;
    },

    // Actions
    start: async (id: string): Promise<ApiResponse<WorkOrder>> => {
        const response = await api.post(`/work-orders/${id}/start`);
        return response.data;
    },
    complete: async (id: string, data: { work_performed: string, actual_cost?: number }): Promise<ApiResponse<WorkOrder>> => {
        const response = await api.post(`/work-orders/${id}/complete`, data);
        return response.data;
    }
};
