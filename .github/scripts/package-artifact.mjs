import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing artifact identity input: ${name}`);
  return value;
};
const sha256 = (file) =>
  createHash('sha256').update(readFileSync(file)).digest('hex');
const output = '.cache/ci-artifact';
mkdirSync(output, { recursive: true });
// Archive the existing checked output; never rebuild during packaging/deployment.
execFileSync('tar', ['-czf', `${output}/dist.tar.gz`, '-C', 'dist', '.']);
const manifest = {
  schemaVersion: 1,
  purpose: 'validation-only',
  deployable: false,
  repository: required('GITHUB_REPOSITORY'),
  event: required('GITHUB_EVENT_NAME'),
  sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  workflowSha: required('GITHUB_SHA'),
  headSha: required('PR_HEAD_SHA'),
  baseSha: process.env.PR_BASE_SHA || null,
  runId: required('GITHUB_RUN_ID'),
  runAttempt: required('GITHUB_RUN_ATTEMPT'),
  siteEnv: required('SITE_ENV'),
  siteOrigin: required('SITE_ORIGIN'),
  nodeVersion: process.version,
  packageManager: JSON.parse(readFileSync('package.json', 'utf8'))
    .packageManager,
  lockfileSha256: sha256('pnpm-lock.yaml'),
  archive: 'dist.tar.gz',
  archiveSha256: sha256(`${output}/dist.tar.gz`),
};
writeFileSync(
  `${output}/manifest.json`,
  `${JSON.stringify(manifest, null, 2)}\n`,
);
