# Smart Food Wastage Analyser — Mess Staff Dashboard

This is the software prototype for the Smart Food Wastage Analyser, a college ECS-II project designed to help mess administrators predict student attendance, track meal intentions, and reduce food wastage.

## Overview
This repository contains a full-stack dashboard prototype tailored for the mess staff. It demonstrates the software architecture and UI required to display predicted versus actual attendance. 

Currently, the application runs in a **Demo / Prototype Mode** where it fetches realistic mock data from a Node.js backend. This architecture allows the future integration of a real database, fingerprint hardware for attendance verification, and the actual Machine Learning model without redesigning the frontend.

## Tech Stack
- **Frontend**: React.js (via Vite)
- **Routing**: `react-router-dom`
- **Charts**: `recharts`
- **Styling**: Vanilla CSS (CSS Variables) with a polished Dark Navy theme.
- **Backend**: Node.js + Express
- **API**: Centralized mock data layer simulation

## Project Structure
```
.
├── backend/
│   ├── server.js          # Express entry point
│   ├── mockData.js        # Centralized mock data layer
│   ├── routes/
│   │   └── api.js         # API endpoint definitions
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx        # Routing configuration
    │   ├── index.css      # Design tokens and global CSS
    │   ├── context/       # Auth context
    │   ├── components/    # Layout components (Sidebar, TopHeader)
    │   └── pages/         # Dashboard views
    └── package.json
```

## Installation & Setup

### 1. Start the Backend API
```bash
cd backend
npm install
npm start
```
The backend will run on `http://localhost:5001`.

### 2. Start the Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The frontend will start on `http://localhost:5173`.

## Demo Login Credentials
Use the following credentials to access the dashboard:
- **Email**: `mess.admin@smartmess.demo`
- **Password**: `Mess@123`

## Available API Endpoints
- `POST /api/auth/login`
- `GET /api/dashboard/summary`
- `GET /api/meals/today`
- `GET /api/predictions`
- `GET /api/attendance`
- `GET /api/analytics`
- `GET /api/profile`

## Current Prototype Limitations
- **No Real Database**: All data is served from `backend/mockData.js`.
- **No ML Model**: The predicted numbers are seeded demo values.
- **No Hardware Integration**: Actual attendance numbers are hardcoded for demonstration purposes rather than collected via ESP32.

## Planned Future Integrations
1. **Phase 2**: Replace `mockData.js` with PostgreSQL/MySQL database connections.
2. **Phase 3**: Integrate ESP32 fingerprint scanners to automatically record actual attendance.
3. **Phase 4**: Deploy the Python scikit-learn ML model as a microservice and replace the mock prediction numbers.
