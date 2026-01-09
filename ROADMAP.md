# Timer Backend - Future Roadmap

This document outlines the planned features and improvements for the Timer Backend project.

## 1. User Profile & Session Management
- [x] **GET `/api/auth/me`**: Fetch current user details (ID, username, names, current status) using the JWT.
- [x] **PUT `/api/auth/profile`**: Update user information (first name, last name, or password).
- [x] **Refresh Tokens**: Implement a refresh token mechanism to keep users logged in securely beyond the 1-hour JWT expiration.

## 2. Enhanced Status Tracking
- [ ] **GET `/api/status/current`**: Retrieve the currently active status log. Essential for frontend synchronization on page refresh.
- [ ] **Status Validation**: Implement validation (e.g., using Zod) to ensure only allowed status names (e.g., `available`, `lunch_break`, `on_production`) are accepted.
- [ ] **Manual Stop**: Add an endpoint to end the current status without starting a new one (e.g., for end-of-shift).

## 3. Analytics & Reporting
- [ ] **GET `/api/status/summary`**: Provide a daily/weekly summary of time spent in each status.
- [ ] **History Filtering**: Add query parameters to `/api/status/history` (e.g., `?from=...&to=...`) for date-range reporting.
- [ ] **Export Feature**: Endpoint to export logs as CSV or JSON for external reporting.

## 4. Admin & Team Features
- [ ] **Supervisor Dashboard**: Endpoints to view the real-time status of all team members.
- [ ] **User Management**: Admin endpoints to create, update, or deactivate user accounts.

## 5. Technical Improvements
- [ ] **CORS Configuration**: Setup `cors` middleware to allow requests from the frontend domain.
- [ ] **Error Handling**: Implement a centralized error-handling middleware for consistent API responses.
- [ ] **Logging**: Add a logging library (like Winston or Pino) for better production monitoring.
- [ ] **Linting**: Add a `lint` script to `package.json` (e.g., using ESLint) to maintain code quality.

---
*Created on: 2026-01-09*
