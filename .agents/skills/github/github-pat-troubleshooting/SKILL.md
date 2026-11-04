---
name: github-pat-troubleshooting
description: "Use when git push returns 403 for PAT tokens."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [github, pat, token, 403, permissions, push]
    related_skills: [github-auth, ai-builder-app-export]
---

# Troubleshooting GitHub Personal Access Tokens (PAT)

## When to Use

Load this when `git push` returns a `403` error or `Resource not accessible by personal access token` even though the token authenticates successfully for read operations (e.g., repository metadata is accessible via API).

## Common Pitfalls & Rules

- **The Contents Permission Trap:** Fine-grained PATs default to `metadata: Read` only. To push commits or create branches, the token **must** explicitly have **`Contents: Read and write`** permission under Repository permissions. Note that `repository creation` permissions do NOT grant push access to existing repositories; without `Contents: Read and write`, git operations fail with a 403.
- **Repository Scope:** Ensure the target repository is explicitly selected under "Repository access" in the token settings.
- **Credential Storage Helper:** Store credentials securely using `git config --global credential.helper store` and write to `~/.git-credentials` with `0600` permissions.
