import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

const API: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api", // backend base URL
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

export async function searchAllergens(q: string, limit = 20) {
  const res = await API.get("/allergens/search", { params: { q, limit } });
  return res.data; // array of { source, id, label, doc }
}

export const getAllergenDetails = async (query: string) => {
  const response = await API.get(`/allergens/search/${query}`);
  return response.data;
};

export default API;
