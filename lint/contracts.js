import {
  domainWisePenErrorRestrictedSyntaxRule,
  errorRules,
  nativeErrorRestrictedSyntaxRules,
} from './error.js';
import { queryRules } from './query.js';

// 专题在此登记一次；插件注册、默认级别和专项检查共用这份定义。
export const lintContracts = {
  query: {
    rules: queryRules,
    severity: 'error',
  },
  error: {
    rules: errorRules,
    severity: 'warn',
    restrictedSyntax: [...nativeErrorRestrictedSyntaxRules, domainWisePenErrorRestrictedSyntaxRule],
  },
};

export const contractRules = Object.assign(
  {},
  ...Object.values(lintContracts).map((contract) => contract.rules)
);

export const contractRuleSettings = Object.fromEntries(
  Object.values(lintContracts).flatMap((contract) =>
    Object.keys(contract.rules).map((name) => [`wisepen/${name}`, contract.severity])
  )
);
