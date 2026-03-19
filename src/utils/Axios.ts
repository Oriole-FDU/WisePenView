// axios request 封装
import axios from 'axios';

// 正式提交部署时使用
export const baseServerAddr = '10.176.44.11:9080';

// 本地开发时使用
// export const baseServerAddr = '127.0.0.1:4523/m1/7566244-7303851-default';

export const baseURL = 'http://' + baseServerAddr + '/';

const Axios = axios.create({
  baseURL: '/api',
  timeout: 5000,
  withCredentials: true,
});

// 暂时在请求时没有操作，传透 config 即可
Axios.interceptors.request.use((config) => config);

Axios.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) return Promise.reject(error);
    const { status, data } = error.response;
    if (status === 401) {
      window.location.href = '/login';
    }
    // 400 视为业务/字段校验错误，把服务端文案挂到 message 上供上层展示
    if (status === 400 && data && typeof data === 'object') {
      const msg =
        (data as { msg?: string }).msg ?? (data as { message?: string }).message ?? '请求参数错误';
      error.message = msg;
    }
    return Promise.reject(error);
  }
);

export default Axios;
