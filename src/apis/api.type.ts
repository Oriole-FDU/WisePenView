/** API 协议中的可空值。仅用于表达后端明确返回 null 的字段。 */
export type Nullable<T> = T | null;

/** 与 Java Cloud、Node Sidecar 的 R<T> 一致，响应体固定包含 key。 */
export interface KeyedApiResponse<T = unknown> {
  code: number;
  key: Nullable<string>;
  msg: Nullable<string>;
  data: T;
}

/** 与 Python Cloud-AI 的 R<T> 一致，不包含 key。 */
export interface PythonApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

/** WisePen 各后端服务可能返回的统一响应体。 */
export type ApiResponse<T = unknown> = KeyedApiResponse<T> | PythonApiResponse<T>;

/** 数字枚举的 API 值。兼容尚未统一的数字字符串返回。 */
export type NumericEnumApiValue<Value extends number = number> = Value | `${Value}`;

/** Java Long 的 API 值。 */
export type JavaLongApiValue = string;

/** Java 分页接口的公共请求参数。 */
export interface PageApiRequest {
  page: number;
  size: number;
}

export type OptionalPageApiRequest = Partial<PageApiRequest>;

/** Java 分页接口的公共响应体。 */
export interface PageR<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}

/** APISIX、FastAPI 等基础设施直接返回的 HTTP 错误体。 */
export interface InfrastructureApiErrorBody {
  /** APISIX 网关错误字段。 */
  error_msg?: string;
  /** 通用 Node/HTTP 框架错误字段。 */
  message?: string;
  /** FastAPI 默认 HTTP 错误字段。 */
  detail?: string;
}

/** HTTP 4xx/5xx 可能返回的已知错误体；string 对应 Python 中间件的纯文本响应。 */
export type ApiErrorBody =
  KeyedApiResponse<unknown> | PythonApiResponse<unknown> | InfrastructureApiErrorBody | string;
