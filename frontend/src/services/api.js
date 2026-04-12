import axios from "axios";

const API = axios.create({
  baseURL: "https://rideshare-pro.onrender.com/api",
  timeout: 20000
});

API.interceptors.request.use((req) => {
    const token = localStorage.getItem("token");
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
  });

export default API;