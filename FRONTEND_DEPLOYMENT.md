# Frontend Deployment Guide

## Environment Variables

The frontend requires the following environment variable to connect to the backend API:

### VITE_API_BASE_URL

This variable specifies the base URL of the ThermaCore backend API.

**For Netlify Deployment:**

1. Go to your Netlify site settings
2. Navigate to "Build & deploy" > "Environment variables"
3. Add a new environment variable:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://thermacoreapp.onrender.com`

**For Local Development:**

1. Copy `.env.example` to `.env`
2. Set `VITE_API_BASE_URL=http://localhost:5000` (or your local backend URL)

## Authentication

The frontend now uses real backend authentication at the `/api/v1/auth/login` endpoint.

- The login request sends: `{ "username": "...", "password": "..." }`
- The backend responds with: `{ "success": true, "data": { "access_token": "...", "user": {...} } }`
- The JWT token is stored in localStorage as `thermacore_token`

## Testing Authentication

To test authentication after deployment:

1. Ensure the backend is running at the URL specified in `VITE_API_BASE_URL`
2. Use valid admin credentials configured in the backend
3. The frontend will make a POST request to `${VITE_API_BASE_URL}/api/v1/auth/login`
4. Upon successful authentication, the JWT token and user data will be stored in localStorage
