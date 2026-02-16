# Reading Plans Backend API

This is a simple Express.js backend that connects to your PostgreSQL database to store and manage reading plans.

```
┌─────────────────────────────────────┐
│   React Native App                  │
│   (Port: 8081)                      │
└──────────────┬──────────────────────┘
               │ HTTP Requests
               ▼
┌─────────────────────────────────────┐
│   Express.js API Server             │
│   (Port: 3000)                      │ ◄── YOU ARE HERE
│   - GET /api/reading-plans          │
│   - POST /api/reading-plans         │
│   - PATCH /api/reading-plans/:id    │
│   - DELETE /api/reading-plans/:id   │
└──────────────┬──────────────────────┘
               │ SQL Queries
               ▼
┌─────────────────────────────────────┐
│   PostgreSQL Database               │
│   (Neon/Azure)                      │
│   Table: reading_plans              │
└─────────────────────────────────────┘
```

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Make sure your `.env` file in the root directory has the DATABASE_URL:
```
DATABASE_URL=postgresql://neondb_owner:npg_ZntwDz8Cqb1T@ep-aged-water-a98nco3i-pooler.gwc.azure.neon.tech/neondb?sslmode=require&channel_binding=require
```

3. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3000`

## API Endpoints

### Get all reading plans
```
GET /api/reading-plans
```

### Get a specific reading plan
```
GET /api/reading-plans/:id
```

### Create a new reading plan
```
POST /api/reading-plans
Content-Type: application/json

{
  "name": "Morning Devotional",
  "days": 90,
  "startDate": "2026-02-16",
  "age": 25
}
```

### Update reading plan status
```
PATCH /api/reading-plans/:id/status
Content-Type: application/json

{
  "status": "completed"
}
```

### Delete a reading plan
```
DELETE /api/reading-plans/:id
```

## Database Schema

The API automatically creates a `reading_plans` table with the following structure:

```sql
CREATE TABLE reading_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  days INTEGER NOT NULL,
  start_date DATE NOT NULL,
  age INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Connecting from React Native

Update your `.env` file to include the API URL:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

For testing on a physical device, replace `localhost` with your computer's local IP address:
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
```
