/**
 * Materialize workspace templates omitted from the published OpenClaw npm tarball.
 * OpenClaw runtime reads HEARTBEAT.md only from src/agents/templates, not docs/reference/templates.
 */

import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = process.cwd()
const BUILD_OPENCLAW = join(PROJECT_ROOT, 'build', 'openclaw')
const RESOURCES_OPENCLAW = join(PROJECT_ROOT, 'resources', 'openclaw')

export const HEARTBEAT_TEMPLATE_RELATIVE_PATH = join('src', 'agents', 'templates', 'HEARTBEAT.md')

const CLEAN_HEARTBEAT_TEMPLATE = [
  '# Keep this file empty (or with only comments) to skip heartbeat API calls.',
  '',
  '# Add tasks below when you want the agent to check something periodically.',
  '',
].join('\n')

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function isDocsHeartbeatTemplate(content: string): boolean {
  return content.includes('# HEARTBEAT.md template') && content.includes('The default runtime template is:')
}

export async function ensureOpenClawWorkspaceTemplates(openclawRoot: string): Promise<boolean> {
  if (!(await fileExists(openclawRoot))) return false

  const target = join(openclawRoot, HEARTBEAT_TEMPLATE_RELATIVE_PATH)
  let shouldWrite = true
  if (await fileExists(target)) {
    const existing = await readFile(target, 'utf8')
    shouldWrite = existing !== CLEAN_HEARTBEAT_TEMPLATE || isDocsHeartbeatTemplate(existing)
  }

  if (shouldWrite) {
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, CLEAN_HEARTBEAT_TEMPLATE, 'utf8')
  }

  return true
}

async function main(): Promise<void> {
  console.log('\nensure-openclaw-workspace-templates\n')
  let touched = 0
  for (const root of [BUILD_OPENCLAW, RESOURCES_OPENCLAW]) {
    if (await ensureOpenClawWorkspaceTemplates(root)) {
      touched += 1
      console.log(`  [ok] ${join(root, HEARTBEAT_TEMPLATE_RELATIVE_PATH)}`)
    }
  }
  if (touched === 0) {
    throw new Error('No OpenClaw bundle found. Run "pnpm run download-openclaw" first.')
  }
  console.log('\n  OK: workspace templates are available\n')
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`\n  FAIL: ensure-openclaw-workspace-templates: ${err.message || err}\n`)
    process.exit(1)
  })
}
