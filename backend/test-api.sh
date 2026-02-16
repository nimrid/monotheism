#!/bin/bash

# Simple script to test the Reading Plans API

API_URL="http://localhost:3000/api"

echo "🧪 Testing Reading Plans API"
echo "=============================="

# Test 0: Health check
echo ""
echo "0️⃣ Health check..."
curl -s "$API_URL/../health" | json_pp || curl -s "$API_URL/../health"

# Test 1: Create a reading plan
echo ""
echo "1️⃣ Creating a test reading plan..."
RESPONSE=$(curl -s -X POST "$API_URL/reading-plans" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Plan",
    "days": 90,
    "startDate": "2026-02-16",
    "age": 25
  }')

echo "Response: $RESPONSE"
PLAN_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Created plan ID: $PLAN_ID"

# Test 2: Get all reading plans
echo ""
echo "2️⃣ Fetching all reading plans..."
curl -s "$API_URL/reading-plans" | json_pp || curl -s "$API_URL/reading-plans"

# Test 3: Get specific reading plan
if [ ! -z "$PLAN_ID" ]; then
  echo ""
  echo "3️⃣ Fetching specific plan ($PLAN_ID)..."
  curl -s "$API_URL/reading-plans/$PLAN_ID" | json_pp || curl -s "$API_URL/reading-plans/$PLAN_ID"
  
  # Test 4: Update plan status
  echo ""
  echo "4️⃣ Updating plan status to 'completed'..."
  curl -s -X PATCH "$API_URL/reading-plans/$PLAN_ID/status" \
    -H "Content-Type: application/json" \
    -d '{"status": "completed"}'
  
  # Test 5: Delete the plan
  echo ""
  echo "5️⃣ Deleting test plan..."
  curl -s -X DELETE "$API_URL/reading-plans/$PLAN_ID"
fi

echo ""
echo "=============================="
echo "✅ API tests completed!"
