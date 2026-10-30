@echo off
if not exist .git (
  git init
  git add .
  git commit -m "feat: complete full-stack AI Interview Analyzer with FastAPI, React, and Gemini AI"
)
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/Harsh24Chandak/ai-interview-analyzer.git
echo Pushing to https://github.com/Harsh24Chandak/ai-interview-analyzer.git (main)...
git push -u origin main
pause
