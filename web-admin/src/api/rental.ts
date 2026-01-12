import { api } from './client';

// ==================== INTERFACES ====================

export interface RentalClient {
    id: string;
    code: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    tax_id?: string;
    is_active: boolean;
}

export interface RentalRate {
    id: string;
    name: string;
    description?: string;
    daily_rate: number;
    currency: string;
    is_active: boolean;
    
    // Enhanced Billing Config
    rate_basis?: 'hourly' | 'daily' | 'monthly';
    minimum_hours?: number;
    overtime_multiplier?: number;
    standby_multiplier?: number;
    breakdown_penalty_per_day?: number;
}

export interface Rental {
    id: string;
    rental_number: string;
    client_id: string;
    asset_id: string;
    rental_rate_id?: string;
    start_date: string;
    end_date?: string;
    status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'rented_out' | 'returned' | 'completed' | 'cancelled' | 'rejected';
    notes?: string;
    
    // Joins
    client_name?: string;
    asset_name?: string;
    rate_name?: string;
    daily_rate?: number;
}

export interface CreateRentalRequest {
    client_id: string;
    asset_id: string;
    rental_rate_id?: string;
    start_date: string; // YYYY-MM-DD
    end_date?: string;
    notes?: string;
}

export interface CreateClientRequest {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    tax_id?: string;
}

export interface CreateRateRequest {
    name: string;
    description?: string;
    daily_rate: number;
    currency: string;
    
    rate_basis?: string;
    minimum_hours?: number;
    overtime_multiplier?: number;
    standby_multiplier?: number;
    breakdown_penalty_per_day?: number;
}

// ==================== API ====================

export const rentalApi = {
    // Clients
    listClients: async () => {
        const response = await api.get<RentalClient[]>('/rentals/clients');
        return response.data;
    },
    
    createClient: async (data: CreateClientRequest) => {
        const response = await api.post<RentalClient>('/rentals/clients', data);
        return response.data;
    },

    // Rates
    listRates: async () => {
        const response = await api.get<RentalRate[]>('/rentals/rates');
        return response.data;
    },

    createRate: async (data: CreateRateRequest) => {
        const response = await api.post<RentalRate>('/rentals/rates', data);
        return response.data;
    },

    // Rentals
    listRentals: async (status?: string) => {
        const params = status ? { status } : {};
        const response = await api.get<Rental[]>('/rentals', { params });
        return response.data;
    },

    getRental: async (id: string) => {
        const response = await api.get<Rental>(`/rentals/${id}`);
        return response.data;
    },

    createRental: async (data: CreateRentalRequest) => {
        const response = await api.post<Rental>('/rentals', data);
        return response.data;
    },

    approveRental: async (id: string, notes?: string) => {
        const response = await api.post(`/rentals/${id}/approve`, { notes });
        return response.data;
    },

    rejectRental: async (id: string, reason: string) => {
        const response = await api.post(`/rentals/${id}/reject`, { reason });
        return response.data;
    },

    dispatchRental: async (id: string, data: { driver_name?: string, truck_plate?: string, notes?: string }) => {
        const response = await api.post(`/rentals/${id}/dispatch`, data);
        return response.data;
    },

    returnRental: async (id: string, data: { return_date: string, meter_reading?: number, notes?: string }) => {
        const response = await api.post(`/rentals/${id}/return`, data);
        return response.data;
    },
};
