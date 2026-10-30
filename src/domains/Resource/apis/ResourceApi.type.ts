/**
 * 资源叶域迁移期的类型别名。
 * 运行时与类型事实源统一由 ResourceCore Schema 提供；叶域完成 Contract 化后删除本文件。
 */
export type {
  ResourceGroupDisplayApi as ResourceGroupDisplayBaseApiResponse,
  ResourceGroupGrantedActionsApi as ResourceGroupGrantedActionsApiResponse,
  ResourceItemApi as ResourceItemApiResponse,
  ResourceSpecifiedUserGrantedActionsApi as ResourceSpecifiedUserGrantedActionsApiResponse,
} from './ResourceCoreApi.schema';
