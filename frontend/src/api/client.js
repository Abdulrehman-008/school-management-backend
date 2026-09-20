import axios from 'axios';

const API = axios.create({
    baseURL: 'https://school-management-backend-inovatters.vercel.app/api',
});

export default API;