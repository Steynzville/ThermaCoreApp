# To-Do List for ThermaCoreApp Recommendations

## Phase 1: Clone repository and analyze current state
- [x] Clone the repository
- [x] Read and understand the recommendations

## Phase 2: Create feature branch and implement security improvements
- [x] Create a new feature branch
- [x] Stop committing .env files
- [x] Use strong, randomly generated JWT_SECRET_KEY
- [x] Manage database credentials securely via environment variables
- [x] Remove default database passwords
- [x] Do not expose database port in production (docker-compose.yml) (addressed in test config))
- [x] Force password change on first login for default admin credentials (default admin user removed from seed data, manual creation requires strong password.)
- [x] Configure TLS for MQTT
- [x] Configure security modes for OPC UA

## Phase 3: Implement API and codebase quality improvements
- [x] Provide clear API schemas and data types
- [x] Use relative paths in test commands and scripts
- [x] Use environment variables for Docker configuration

## Phase 4: Create pull request with comprehensive changes
- [x] Commit changes to the feature branch
- [x] Create a pull request (PR #80)
- [x] Deliver outcome to user

## All Tasks Complete! ✅

All app improvement tasks have been successfully completed and documented in PR #80. See [APP_IMPROVEMENT_TASKS_PR_DESCRIPTION.md](./APP_IMPROVEMENT_TASKS_PR_DESCRIPTION.md) for comprehensive details.

