// axios request 封装 
import axios from 'axios';
const request = axios.create({
    baseURL: 'http://wisepen-dev-server:9080',
    timeout: 5000,
    withCredentials: true
});

export default request;