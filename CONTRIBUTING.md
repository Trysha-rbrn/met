# Contributing Guide

Thanks for your interest in contributing to `met`.

## Ground Rules

- Be respectful and constructive.
- Keep pull requests focused and small when possible.
- Add tests (or clear manual test notes) for behavioral changes.
- Update docs when changing user-facing behavior.

## Development Setup

1. Fork the repository and clone your fork.
2. Create a feature branch from `main`.
3. Install dependencies:
   - Backend: `cd backend && npm install`
   - Frontend: `cd frontend && npm install`
4. Configure environment variables:
   - Copy `.env.example` files if available, or follow README setup docs.
5. Run the app locally:
   - Backend: `npm run dev`
   - Frontend: `npm run dev`

## Recommended Workflow

1. Sync with upstream `main`.
2. Create a branch:
   - `git checkout -b feat/short-description`
3. Implement and test your changes.
4. Run checks before pushing:
   - Backend tests/lint/typecheck
   - Frontend tests/lint/typecheck
5. Commit with clear messages.
6. Push branch and open a Pull Request.

## Commit Message Style

Use concise, descriptive commits. Suggested prefixes:

- `feat:` new functionality
- `fix:` bug fix
- `refactor:` internal code improvements
- `docs:` documentation updates
- `test:` tests added/updated
- `chore:` maintenance tasks

Example:

`feat(transactions): add recurring transaction due-run action`

## Pull Request Checklist

- [ ] Code builds successfully
- [ ] Relevant tests pass
- [ ] Lint/type checks pass
- [ ] Docs updated where needed
- [ ] No unrelated file changes included

## Reporting Security Issues

Do not open public issues for vulnerabilities.

Please follow instructions in [SECURITY.md](./SECURITY.md).
