import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('icos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Signal AuthContext to clear state and let React Router redirect.
      // Using a custom event avoids a hard browser navigation that breaks SPA state.
      window.dispatchEvent(new CustomEvent('icos:auth:expired'));
    }
    return Promise.reject(error);
  },
);

export default client;
