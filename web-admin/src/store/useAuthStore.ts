import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// import { jwtDecode } from 'jwt-decode';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    role_level?: number;
    // permissions?: string[]; // permissions usually in token, but maybe helpful here
}

interface AuthState {
    token: string | null;
    user: User | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: () => boolean;
    isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            login: (token, user) => set({ token, user }),
            logout: () => set({ token: null, user: null }),
            isAuthenticated: () => !!get().token,
            isAdmin: () => {
                const user = get().user;
                return user?.role === 'admin' || user?.role === 'super_admin';
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);
