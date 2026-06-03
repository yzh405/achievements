# 🏆 Achievements

Token usage tracker & achievement system for LLM power users.

Track your token consumption across Claude Code sessions, visualize usage patterns, and prepare for the upcoming desktop pet feature.

## Quick Start

```bash
# Install dependencies and link globally
npm install
npm link -w packages/cli

# Import your Claude Code history
achievements ingest

# View your dashboard
achievements
```

## Commands

| Command | Description |
|---------|-------------|
| `achievements` | Dashboard (last 7 days overview) |
| `achievements ingest` | Import Claude Code transcripts |
| `achievements ingest --dry-run` | Preview what would be imported |
| `achievements stats` | All-time summary |
| `achievements daily` | Daily breakdown (last 7 days) |
| `achievements daily 2026-06-03` | Single day report |
| `achievements weekly` | Weekly breakdown (last 4 weeks) |
| `achievements models` | Token breakdown by model |
| `achievements projects` | Token breakdown by project |
| `achievements add -m gpt-4 -i 5000 -o 2000` | Manual entry |

## Data Storage

All data is stored locally at `~/.achievements/tokens.db` (SQLite).

## Project Structure

```
packages/
├── core/    @achievements/core   — Data models, storage, queries
└── cli/     @achievements/cli    — CLI interface (commander.js)
```

## Roadmap

- [x] Phase 1: Token data layer + CLI dashboard
- [ ] Phase 2: Achievement system (milestones, badges, streaks)
- [ ] Phase 3: Desktop pet (feed with tokens!)

## Requirements

- Node.js >= 18
- macOS / Linux / Windows
