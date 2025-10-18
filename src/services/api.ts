import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

const API: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // backend base URL
});

// Attach token to every request when available
API.interceptors.request.use(
  (req: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem("token");
    if (token && req.headers) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
  },
  (error) => Promise.reject(error)
);
// src/services/api.ts  (add these exports)
export async function searchAllergens(q: string, limit = 20) {
  const res = await API.get("/allergens/search", { params: { q, limit } });
  return res.data; // array of { source, id, label, doc }
}

export async function getAllergenById(source: string, id: string) {
  const res = await API.get(`/allergens/${source}/${id}`);
  return res.data;
}

export default API;
