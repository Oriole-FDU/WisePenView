import type {
  SkillApiItem,
  SkillDetailApiResponse,
  SkillVersionApiItem,
} from '../apis/SkillApi.type';
import type { SkillDetail, SkillSummary, SkillVersion } from '../service/index.type';

export function mapApiSkillItemToSummary(item: SkillApiItem): SkillSummary {
  return {
    skillId: item.skill_id,
    displayName: item.display_name,
    description: item.description ?? '',
    icon: item.icon,
    status: item.status,
    currentVersionId: item.current_active_version_id,
    scopeType: item.scope_type ?? 'PERSONAL',
    groupId: item.group_id,
    groupName: item.group_name,
  };
}

export function mapApiSkillDetailToDetail(api: SkillDetailApiResponse): SkillDetail {
  return {
    skillId: api.skill_id,
    displayName: api.display_name,
    description: api.description ?? '',
    icon: api.icon,
    status: api.status,
    currentVersionId: api.current_active_version_id,
    scopeType: api.scope_type ?? 'PERSONAL',
    groupId: api.group_id,
    groupName: api.group_name,
    versions: (api.versions ?? []).map(mapApiSkillVersionToVersion),
  };
}

function mapApiSkillVersionToVersion(api: SkillVersionApiItem): SkillVersion {
  return {
    versionId: api.version_id,
    versionNumber: api.version_number,
    versionKind: api.version_kind,
    publishStatus: api.publish_status,
  };
}
