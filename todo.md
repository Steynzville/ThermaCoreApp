# To-Do List for ThermaCoreApp Recommendations

## Phase 1: Clone repository and analyze current state
- [x] Clone the repository
- [ ] Read and understand the recommendations

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
- [ ] Create a pull request
- [ ] Deliver outcome to user

