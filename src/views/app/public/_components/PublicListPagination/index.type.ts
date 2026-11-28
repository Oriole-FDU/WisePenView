export interface PublicListPaginationProps {
  page: number;
  size: number;
  total: number;
  onChange: (page: number, size: number) => void;
}
