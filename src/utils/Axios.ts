// axios request 封装 
import axios from 'axios';

export const baseServerAddr = 'wisepen-dev-server:9080';
// export const baseServerAddr = '127.0.0.1:4523/m1/7566244-7303851-default';
export const baseURL = 'http://' + baseServerAddr + '/';

const Axios = axios.create({
    baseURL: baseURL,
    timeout: 5000,
    withCredentials: true
});

Axios.interceptors.request.use(

);

Axios.interceptors.response.use(
    response => response.data,
    error => {
        if (error.response && error.response.status === 401) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default Axios;

