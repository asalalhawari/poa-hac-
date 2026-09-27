#!/usr/bin/env bash

# ==============================================================================
# POA-HAC Service Startup Script (macOS / Linux / Git Bash)
# Launches both Express Backend (Port 3001) and Vite Frontend (Port 5173)
# ==============================================================================

set -e

# Change directory to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================================="
echo "  🚀 Starting POA-HAC Inferred Engine & Clinical Review Portal   "
echo "================================================================="

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 node_modules not found. Installing dependencies..."
  npm install
fi

# Cleanup handler for graceful shutdown on Ctrl+C (SIGINT) or SIGTERM
cleanup() {
  trap - SIGINT SIGTERM EXIT
  echo ""
  echo "🛑 Shutting down POA-HAC services..."
  
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  
  # Wait for any lingering children
  wait 2>/dev/null || true
  echo "✅ All services stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend API Server
echo "🏥 [1/2] Starting Backend API Service (Port 3001)..."
npm run server &
BACKEND_PID=$!

# Brief pause to allow the backend port binding
sleep 1.5

# 2. Start Frontend Dev Server
echo "💻 [2/2] Starting Frontend Vite UI (Port 5173)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================================================="
echo "  ✨ Both services are running successfully:                     "
echo "  ---------------------------------------------------------------"
echo "  🏥 Backend API:  http://localhost:3001                         "
echo "  💻 Frontend UI:  http://localhost:5173                         "
echo "  📑 Review Queue: http://localhost:5173/claims                  "
echo "  ---------------------------------------------------------------"
echo "  Press [Ctrl+C] in this terminal to stop both services.         "
echo "================================================================="
echo ""

# Wait for both child processes to keep the script running in foreground
wait
