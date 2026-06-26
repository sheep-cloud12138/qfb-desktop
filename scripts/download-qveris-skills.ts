/**
 * Bundle QVeris official OpenClaw skill before packaging.
 *
 * The skill still reads QVERIS_API_KEY from the user's environment at runtime.
 * Do not bundle secrets here.
 */

import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

const PROJECT_ROOT = process.cwd()
const BUILD_OPENCLAW_DIR = join(PROJECT_ROOT, 'build', 'openclaw')
const RESOURCES_OPENCLAW_DIR = join(PROJECT_ROOT, 'resources', 'openclaw')
const SKILL_ID = 'qveris-official'
const SKILL_MARKER = 'SKILL.md'
const DEFAULT_REF = 'main'

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function looksLikeQverisSkillDir(dir: string): Promise<boolean> {
  if (!(await fileExists(join(dir, SKILL_MARKER)))) return false
  const readme = join(dir, 'README.md')
  if (!(await fileExists(readme))) return true
  const body = await readFile(readme, 'utf8')
  return body.toLowerCase().includes('qveris')
}

async function resolveQverisSkillDir(sourceRoot: string): Promise<string> {
  const directCandidates = [sourceRoot, join(sourceRoot, SKILL_ID)]
  for (const candidate of directCandidates) {
    if (await looksLikeQverisSkillDir(candidate)) return candidate
  }

  const entries = await readdir(sourceRoot, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const candidate = join(sourceRoot, entry.name, SKILL_ID)
    if (await looksLikeQverisSkillDir(candidate)) return candidate
  }

  throw new Error(
    `Could not find ${SKILL_ID}/${SKILL_MARKER} under ${sourceRoot}. ` +
      'Check OPENCLAW_QVERIS_SKILLS_SOURCE_DIR or the GitHub tarball layout.',
  )
}

function qverisTarballUrl(): string {
  const explicitUrl = process.env.OPENCLAW_QVERIS_SKILLS_TARBALL_URL?.trim()
  if (explicitUrl) return explicitUrl
  const ref = process.env.OPENCLAW_QVERIS_SKILLS_REF?.trim() || DEFAULT_REF
  return `https://codeload.github.com/QVerisAI/open-qveris-skills/tar.gz/refs/heads/${ref}`
}

async function downloadAndExtractSkillRepo(workDir: string): Promise<string> {
  const tarballUrl = qverisTarballUrl()
  const tarballPath = join(workDir, `open-qveris-skills-${randomBytes(4).toString('hex')}.tar.gz`)
  const extractDir = join(workDir, 'extract')

  console.log(`  [download] ${tarballUrl}`)
  const response = await fetch(tarballUrl)
  if (!response.ok) {
    throw new Error(`Failed to download QVeris skills tarball: HTTP ${response.status}`)
  }
  await writeFile(tarballPath, Buffer.from(await response.arrayBuffer()))

  await mkdir(extractDir, { recursive: true })
  execFileSync('tar', ['-xzf', tarballPath, '-C', extractDir], { stdio: 'inherit' })
  return extractDir
}

async function copySkillIntoOpenClaw(openclawDir: string, sourceSkillDir: string): Promise<void> {
  const skillsDir = join(openclawDir, 'skills')
  const dest = join(skillsDir, SKILL_ID)

  await mkdir(skillsDir, { recursive: true })
  await rm(dest, { recursive: true, force: true })
  await cp(sourceSkillDir, dest, { recursive: true })

  if (!(await fileExists(join(dest, SKILL_MARKER)))) {
    throw new Error(`Copied ${SKILL_ID}, but ${SKILL_MARKER} is missing at ${dest}`)
  }

  console.log(`  [copy] ${SKILL_ID} -> ${basename(openclawDir)}/skills/${SKILL_ID}`)
}

async function main(): Promise<void> {
  console.log(`\ndownload-qveris-skills: ${SKILL_ID}\n`)

  const targets: string[] = []
  if (await fileExists(join(BUILD_OPENCLAW_DIR, 'openclaw.mjs'))) {
    targets.push(BUILD_OPENCLAW_DIR)
  }
  if (await fileExists(join(RESOURCES_OPENCLAW_DIR, 'openclaw.mjs'))) {
    targets.push(RESOURCES_OPENCLAW_DIR)
  }
  if (targets.length === 0) {
    throw new Error(
      'OpenClaw bundle not found. Run "pnpm run download-openclaw" before "pnpm run download-qveris-skills".',
    )
  }

  const sourceOverride = process.env.OPENCLAW_QVERIS_SKILLS_SOURCE_DIR?.trim()
  const tempDir = await mkdtemp(join(tmpdir(), 'openclaw-qveris-skills-'))
  try {
    const sourceRoot = sourceOverride || (await downloadAndExtractSkillRepo(tempDir))
    const sourceSkillDir = await resolveQverisSkillDir(sourceRoot)
    for (const target of targets) {
      await copySkillIntoOpenClaw(target, sourceSkillDir)
    }
  } finally {
    if (!sourceOverride) {
      await rm(tempDir, { recursive: true, force: true })
    }
  }

  console.log(`\n  OK: ${SKILL_ID} bundled. QVERIS_API_KEY is still configured by the user at runtime.\n`)
}

main().catch((err) => {
  console.error(`\n  FAIL: download-qveris-skills: ${err.message || err}\n`)
  process.exit(1)
})
