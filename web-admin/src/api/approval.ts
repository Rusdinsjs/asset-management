import { api } from './client';

export interface ApprovalRequest {
    id: string;
    resource_type: string;
    resource_id: string;
    action_type: string;
    requested_by: string;
    requester_name?: string;
    data_snapshot: any;
    status: string;
    current_approval_level: number;
    created_at: string;
    updated_at: string;
    notes_l1?: string;
    notes_l2?: string;
}

export const approvalApi = {
    listPending: async () => {
        const response = await api.get('/approvals/pending');
        return response.data;
    },
    listMyRequests: async () => {
        const response = await api.get('/approvals/my-requests');
        return response.data;
    },
    approve: async (id: string, notes?: string) => {
        const response = await api.post(`/approvals/${id}/approve`, { notes });
        return response.data;
    },
    reject: async (id: string, notes: string) => {
        const response = await api.post(`/approvals/${id}/reject`, { notes });
        return response.data;
    },
    create: async (data: {
        resource_type: string;
        resource_id: string;
        action_type: string;
        data_snapshot?: any;
    }) => {
        const response = await api.post('/approvals/requests', data);
        return response.data;
    }
};
