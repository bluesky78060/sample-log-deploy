#!/bin/bash
# AI-PM Context Restoration Script
# 컴팩션 후 ai-pm 프로젝트 컨텍스트를 자동으로 복원합니다

CONTEXT_FILE=".omc/state/ai-pm-context.json"

if [ -f "$CONTEXT_FILE" ]; then
  echo "[AI-PM] Context restored from $CONTEXT_FILE"
  cat "$CONTEXT_FILE"
else
  echo "[AI-PM] No context file found at $CONTEXT_FILE"
fi
