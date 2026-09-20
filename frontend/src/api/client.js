import axios from 'axios';

const API = axios.create({
    baseURL: 'https://school-management-backend-pg5b8ji0b-inovatters.vercel.app/api',
});

export default API;