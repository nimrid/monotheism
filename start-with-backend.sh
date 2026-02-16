#!/bin/bash

# Quick start script for running the app with backend

echo "🚀 Starting Reading Plans Backend and App..."

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
fi

# Start backend in background
echo "🔧 Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Start Expo
echo "📱 Starting Expo app..."
npm start

# Cleanup on exit
trap "echo '🛑 Stopping backend server...'; kill $BACKEND_PID" EXIT
