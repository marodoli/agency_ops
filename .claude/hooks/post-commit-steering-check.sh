#!/bin/bash
# PostToolUse hook: po git commit připomene steering docs self-check
# Stdout se zobrazí Claudovi jako feedback.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Reaguj jen na git commit
if [[ "$COMMAND" != *"git commit"* ]]; then
  exit 0
fi

cat <<'EOF'
STEERING DOCS SELF-CHECK (Rule #14):
Commit proběhl. Před pokračováním zkontroluj, zda některý steering doc potřebuje update:
1. docs/libraries.md — nové API, schémata, závislosti?
2. docs/design.md — nové UI patterny, komponenty?
3. docs/tech.md — změna adresářové struktury?
4. .claude/memory/decisions.md — architektonické rozhodnutí?
5. .claude/memory/active-plan.md — posun v checkpointu?

Pokud ANO → updatuj PŘED dalším krokem.
Pokud NE → pokračuj.
EOF
