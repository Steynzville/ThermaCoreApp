This PR implements the security and quality recommendations provided in the attached document. Key changes include:

- **Enhanced Security:**
  - Enforced environment variable usage for `SECRET_KEY` and `JWT_SECRET_KEY`.
  - Removed default admin user from seed data to prevent default credential misuse.
  - Updated `docker-compose.test.yml` to use environment variables for database credentials and un-expose the database port.
  - Strengthened MQTT and OPC UA security configurations in `backend/config.py` by enforcing TLS and security modes in production and validating certificate paths.

- **Codebase Quality:**
  - Clarified API schema types in `backend/app/utils/schemas.py`.
  - Replaced absolute paths with relative paths in `docs/Testing_Guidelines.md` for improved portability.
  - Ensured Docker configurations leverage environment variables for sensitive data.

These changes significantly improve the application's security posture and maintainability.

