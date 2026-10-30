#!/usr/bin/env bash
set -e
if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "feat: complete full-stack AI Interview Analyzer with FastAPI, React, and Gemini AI"
fi
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/Harsh24Chandak/ai-interview-analyzer.git
echo "Pushing to https://github.com/Harsh24Chandak/ai-interview-analyzer.git (main)..."
git push -u origin main
