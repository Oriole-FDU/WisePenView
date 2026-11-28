#!/usr/bin/env node
/** 按契约筛选同一份 ESLint 配置的诊断；不维护独立规则或存量豁免。 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

import { lintContracts } from '../lint/contracts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const requested = process.argv.slice(2);
  const names = [...new Set(requested.length ? requested : Object.keys(lintContracts))];
  const unknown = names.filter((name) => !Object.hasOwn(lintContracts, name));
  if (unknown.length) {
    throw new Error(
      `未知 lint 契约：${unknown.join(', ')}；可用契约：${Object.keys(lintContracts).join(', ')}`
    );
  }

  const contracts = names.map((name) => lintContracts[name]);
  const ruleIds = new Set(
    contracts.flatMap((contract) => Object.keys(contract.rules).map((name) => `wisepen/${name}`))
  );
  const syntaxMessages = new Set(
    contracts.flatMap((contract) => (contract.restrictedSyntax ?? []).map((rule) => rule.message))
  );
  const eslint = new ESLint({ cwd: root });
  const reports = await eslint.lintFiles(['src/**/*.{ts,tsx,js}']);
  const selected = reports.map((report) => {
    const messages = report.messages.filter(
      (message) =>
        message.fatal ||
        (message.ruleId === null && message.severity === 2) ||
        ruleIds.has(message.ruleId) ||
        (message.ruleId === 'no-restricted-syntax' && syntaxMessages.has(message.message))
    );
    return {
      ...report,
      messages,
      errorCount: messages.filter((message) => message.severity === 2).length,
      warningCount: messages.filter((message) => message.severity === 1).length,
      fatalErrorCount: messages.filter((message) => message.fatal).length,
      fixableErrorCount: messages.filter((message) => message.severity === 2 && message.fix).length,
      fixableWarningCount: messages.filter((message) => message.severity === 1 && message.fix)
        .length,
    };
  });

  const formatter = await eslint.loadFormatter('stylish');
  const output = formatter.format(selected);
  if (output) process.stdout.write(output);
  const count = selected.reduce((total, report) => total + report.messages.length, 0);
  console.log(`contract lint (${names.join(', ')}): ${count} hit(s)`);
  process.exitCode = count > 0 ? 1 : 0;
}

try {
  await main();
} catch (error) {
  console.error('契约 lint 执行失败：', error);
  process.exitCode = 1;
}
