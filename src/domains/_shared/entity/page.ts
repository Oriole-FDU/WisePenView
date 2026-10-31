export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}
