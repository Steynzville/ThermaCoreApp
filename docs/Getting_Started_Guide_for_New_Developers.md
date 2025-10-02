# Getting Started Guide for New Developers

> **Last Reviewed**: October 2024  
> **Status**: Current and Accurate

This guide provides instructions for setting up your development environment and running the ThermaCoreApp locally. It covers both the backend (Flask API) and the frontend (React application).

## 1. Prerequisites

Before you begin, ensure you have the following software installed on your system:

*   **Python 3.9+**: For the backend API.
*   **Node.js 18+**: For the frontend React application.
*   **pnpm**: A fast, disk space efficient package manager for JavaScript (used by the frontend).
    ```bash
    npm install -g pnpm
    ```
*   **Docker and Docker Compose**: (Optional, but recommended for database setup) For running PostgreSQL.
*   **Git**: For cloning the repository.

## 2. Project Structure

The ThermaCoreApp repository is structured into two main parts:

*   `backend/`: Contains the Flask API, database models, routes, services, and configuration.
*   `src/`: Contains the React frontend application, including components, pages, services, and styling.

## 3. Backend Setup (Flask API)

### 3.1. Clone the Repository

First, clone the ThermaCoreApp repository to your local machine:

```bash
gh repo clone Steynzville/ThermaCoreApp
cd ThermaCoreApp
```

### 3.2. Create and Activate Virtual Environment

Navigate to the `backend` directory and create a Python virtual environment:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
```

### 3.3. Install Dependencies

Install the required Python packages:

```bash
pip install -r requirements.txt
```

### 3.4. Database Setup

The application uses PostgreSQL. You can either set up a local PostgreSQL instance or use Docker.

#### Option A: Using Docker (Recommended)

Create a `docker-compose.yml` file in the `backend` directory with the following content:

```yaml
version: '3.8'
services:
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: thermacore_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

Then, start the PostgreSQL container:

```bash
docker-compose up -d db
```

#### Option B: Local PostgreSQL Installation

Ensure you have PostgreSQL installed and running. Create a database named `thermacore_db` and a user with appropriate permissions.

### 3.5. Environment Variables

Create a `.env` file in the `backend` directory based on `config.py` and set the `FLASK_ENV` to `development` and `SQLALCHEMY_DATABASE_URI`.

Example `.env`:

```
FLASK_ENV=development
SQLALCHEMY_DATABASE_URI=postgresql://postgres:password@localhost:5432/thermacore_db
JWT_SECRET_KEY=super-secret-jwt-key
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
OPCUA_SERVER_URL=opc.tcp://localhost:4840
```

### 3.6. Initialize Database

Run the database migrations and seed initial data:

```bash
flask init-db
```

### 3.7. Run the Backend

Start the Flask development server:

```bash
python run.py
```

The backend API will be running at `http://localhost:5000`.

## 4. Frontend Setup (React Application)

### 4.1. Navigate to Project Root

If you are in the `backend` directory, return to the project root:

```bash
cd ..
```

The frontend source code is located in the `src/` directory at the project root.

### 4.2. Install Dependencies

From the project root, install the Node.js dependencies using pnpm:

```bash
pnpm install
```

### 4.3. Run the Frontend

Start the React development server:

```bash
pnpm run dev
```

The frontend application will typically be available at `http://localhost:5173` (or another port if 5173 is in use).

## 5. Accessing the Application

Once both the backend and frontend servers are running, open your web browser and navigate to the frontend URL (e.g., `http://localhost:5173`). You should be able to log in with the default admin credentials:

*   **Username:** `admin`
*   **Password:** `admin123`

This information is provided after running `flask init-db`.
