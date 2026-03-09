# Quickstart: عقارك (Aqarak) Platform

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm 9+

## Backend Setup

1. **Clone and install**:
   ```bash
   git clone https://github.com/MohamedRamadanSalah/Real_estate.git
   cd Real_estate
   git checkout 001-aqarak-platform
   npm install
   ```

2. **Configure environment**: Copy `.env.example` to `.env` and fill:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://user:pass@localhost:5432/aqarak
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:5173
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your-email
   SMTP_PASS=your-password
   NODE_ENV=development
   ```

3. **Initialize database**:
   ```bash
   psql -U postgres -c "CREATE DATABASE aqarak;"
   psql -U postgres -d aqarak -f schema.sql
   psql -U postgres -d aqarak -f production_upgrade.sql
   ```

4. **Run notification migration** (new):
   ```sql
   -- Run against aqarak database
   CREATE TABLE notifications (
       id SERIAL PRIMARY KEY,
       user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       event_type VARCHAR(50) NOT NULL,
       title_ar VARCHAR(255) NOT NULL,
       title_en VARCHAR(255) NOT NULL,
       message_ar TEXT NOT NULL,
       message_en TEXT NOT NULL,
       reference_type VARCHAR(50),
       reference_id INT,
       is_read BOOLEAN DEFAULT FALSE,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   CREATE INDEX idx_notifications_user_id ON notifications(user_id);
   CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read)
       WHERE is_read = FALSE;
   ```

5. **Seed data** (optional):
   ```bash
   npm run seed
   ```

6. **Create admin user**:
   ```bash
   node create_admin.js
   ```

7. **Start server**:
   ```bash
   npm start     # production
   # or
   node server.js  # development
   ```

   Server runs at `http://localhost:5000`

## Frontend Setup (New)

1. **Create React app**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start dev server**:
   ```bash
   npm run dev
   ```

   Frontend runs at `http://localhost:5173`

## Running Tests

```bash
# Backend tests
npm test

# Specific test file
npx cross-env NODE_ENV=test jest tests/auth.test.js --verbose --forceExit
```

## API Health Check

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "server_time": "2026-03-06T..."
}
```

## Key URLs

| Service | URL |
|---------|-----|
| Backend API | `http://localhost:5000/api` |
| Frontend | `http://localhost:5173` |
| Health check | `http://localhost:5000/api/health` |
| Uploads | `http://localhost:5000/uploads/` |
