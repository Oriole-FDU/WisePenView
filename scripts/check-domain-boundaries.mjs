import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const domainRoot = join(root, 'src/domains');

const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const normalizePath = (path) => relative(root, path).split('\\').join('/');

const forbiddenImports = {
  ChatConfig: new Set(['ChatSession', 'ChatTurn']),
  ChatSession: new Set(['ChatConfig', 'ChatTurn']),
  ChatTurn: new Set(['ChatConfig']),
  User: new Set(['Feedback', 'UserInvite', 'UserTask', 'UserTour', 'UserVerification']),
  Feedback: new Set(['User', 'UserInvite', 'UserTask', 'UserTour', 'UserVerification']),
  UserInvite: new Set(['Feedback', 'UserTask', 'UserTour', 'UserVerification']),
  UserTask: new Set(['Feedback', 'User', 'UserInvite', 'UserTour', 'UserVerification']),
  UserTour: new Set(['Feedback', 'User', 'UserInvite', 'UserTask', 'UserVerification']),
  UserVerification: new Set(['Feedback', 'User', 'UserInvite', 'UserTask', 'UserTour']),
  Resource: new Set(['Agent', 'Document', 'HtmlPage', 'Note', 'ResourceAccess', 'Skill']),
  Agent: new Set(['ResourceAccess']),
  Document: new Set(['ResourceAccess']),
  HtmlPage: new Set(['ResourceAccess']),
  Note: new Set(['ResourceAccess']),
  ResourceInteraction: new Set(['ResourceAccess', 'ResourceComment', 'ResourceFavorite']),
  ResourceComment: new Set(['ResourceAccess', 'ResourceFavorite', 'ResourceInteraction']),
  ResourceFavorite: new Set(['ResourceAccess', 'ResourceComment', 'ResourceInteraction']),
  Skill: new Set(['ResourceAccess']),
};

const errors = [];
for (const [domain, forbidden] of Object.entries(forbiddenImports)) {
  const directory = join(domainRoot, domain);
  for (const path of walk(directory).filter((file) => ['.ts', '.tsx'].includes(extname(file)))) {
    const source = ts.createSourceFile(
      path,
      readFileSync(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );

    const visit = (node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const match = node.moduleSpecifier.text.match(/^@\/domains\/([^/]+)/);
        if (match && forbidden.has(match[1])) {
          errors.push(`${normalizePath(path)} 禁止从 ${match[1]} import；该依赖方向属于上层聚合`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}

if (errors.length > 0) {
  console.error('Domain 依赖边界检查失败：');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Domain 依赖边界检查通过：Chat、Resource、User 拆分域未反向依赖其下游聚合。');
