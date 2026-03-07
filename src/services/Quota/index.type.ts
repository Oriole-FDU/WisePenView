/** 设置成员配额请求参数 */
export interface SetGroupQuotaRequest {
  groupId: number;
  targetUserIds: number[];
  newLimit: number;
}
