import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Detect URL based on environment
// Android Emulator uses 10.0.2.2 to access localhost
const API_URL = 'http://192.168.1.4:8080/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            await SecureStore.deleteItemAsync('auth_token');
            // We can't directly redirect here easily without navigation ref, 
            // but the AuthStore state change should trigger it.
        }
        return Promise.reject(error);
    }
);
