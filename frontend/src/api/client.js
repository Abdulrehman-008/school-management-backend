import axios from 'axios';

const API = axios.create({
    baseURL: 'http://10.0.2.2:5000/api', // Android Emulator Localhost
});

export default API;