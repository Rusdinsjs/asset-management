import { api } from './client';

export interface ApprovalRequest {
    id: string;
    resource_type: string;
    resource_id: string;
    action_type: string;
    current_approval_level: number;
    status: 'PENDING' | 'APPROVED_L1' | 'APPROVED_L2' | 'REJECTED';
    requested_by: string; // User ID
    requested_at: string;
    data_snapshot?: any;
    workflow_id?: string;
    approver_id?: string;
    approval_date?: string;
    notes?: string;
}

export const approvalsApi = {
    listPending: async (_roleLevel: number) => {
        // Backend determines logic based on user context usually, but we called it list_pending_requests
        const response = await api.get<any>('/approvals/pending');
        return response.data.data as ApprovalRequest[];
    },

    listMyRequests: async () => {
        const response = await api.get<any>('/approvals/my-requests');
        return response.data.data as ApprovalRequest[];
    },

    approve: async (id: string, notes?: string) => {
        const response = await api.post<any>(`/approvals/${id}/approve`, { notes });
        return response.data.data as ApprovalRequest;
    },

    reject: async (id: string, notes: string) => {
        const response = await api.post<any>(`/approvals/${id}/reject`, { notes });
        return response.data.data as ApprovalRequest;
    },
};
