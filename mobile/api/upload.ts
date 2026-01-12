import axios from 'axios';
import { API_URL } from './client';

export interface UploadResponse {
    id: string;
    url: string;
    original_name: string;
    content_type: string;
    size: number;
}

export const uploadApi = {
    uploadImage: async (uri: string): Promise<UploadResponse> => {
        const formData = new FormData();

        // Extract name and type securely
        const filename = uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        // Append file
        formData.append('file', {
            uri,
            name: filename,
            type,
        } as any);

        console.log('Uploading:', { uri, filename, type, url: `${API_URL}/uploads` });

        // Use a fresh instance to avoid 'application/json' default header from the shared api client
        const response = await axios.post(`${API_URL}/uploads`, formData, {
            headers: {
                // Explicitly set multipart/form-data. 
                // In recent Axios versions, this works fine with FormData, 
                // but if it fails, we might need to remove it to let the browser set boundary.
                // However, bypassing the shared client is the key fix here.
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    }
};
