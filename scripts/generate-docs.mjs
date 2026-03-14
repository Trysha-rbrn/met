import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const docsDir = path.join(root, 'docs', 'auto')
fs.mkdirSync(docsDir, { recursive: true })

const now = new Date().toISOString()

const safeExec = (command) => {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

const gitBranch = safeExec('git rev-parse --abbrev-ref HEAD') || 'unknown'
const gitCommit = safeExec('git rev-parse HEAD') || 'unknown'
const shortCommit = gitCommit.slice(0, 7)
const changes = safeExec('git log --pretty=format:"- %h %s (%an)" -n 25')
const fileTree = safeExec('git ls-files')

const readJson = (relPath) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'))
  } catch {
    return {}
  }
}

const backendPkg = readJson('backend/package.json')
const frontendPkg = readJson('frontend/package.json')

const overview = `# MET Auto Project Overview

Generated: ${now}

## Repository
- Branch: ${gitBranch}
- Commit: ${gitCommit}

## Apps
- Frontend: ${frontendPkg.name || 'frontend'} (${frontendPkg.version || 'n/a'})
- Backend: ${backendPkg.name || 'backend'} (${backendPkg.version || 'n/a'})

## Frontend Scripts
${Object.entries(frontendPkg.scripts || {}).map(([k, v]) => `- \`${k}\`: \`${v}\``).join('\n') || '- n/a'}

## Backend Scripts
${Object.entries(backendPkg.scripts || {}).map(([k, v]) => `- \`${k}\`: \`${v}\``).join('\n') || '- n/a'}
`

const changelog = `# MET Auto Change Log

Generated: ${now}
- Branch: ${gitBranch}
- Commit: ${shortCommit}

## Recent Commits
${changes || '- No commits found'}
`

const inventory = `# MET Auto File Inventory

Generated: ${now}

## Tracked Files
${fileTree.split('\n').filter(Boolean).map((line) => `- \`${line}\``).join('\n')}
`

fs.writeFileSync(path.join(docsDir, 'PROJECT_OVERVIEW.md'), overview)
fs.writeFileSync(path.join(docsDir, 'CHANGELOG.md'), changelog)
fs.writeFileSync(path.join(docsDir, 'FILE_INVENTORY.md'), inventory)

console.log('Auto docs generated in docs/auto')
