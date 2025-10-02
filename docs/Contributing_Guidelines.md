# Contributing Guidelines

> **Last Reviewed**: October 2024  
> **Status**: Current and Accurate

We welcome contributions to the ThermaCoreApp project! By contributing, you help us improve the application for everyone. To ensure a smooth and collaborative development process, please follow these guidelines.

## 1. Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [project maintainer email/contact method].

## 2. How to Contribute

### 2.1. Reporting Bugs

*   Before submitting a new bug report, please check the existing issues to see if your problem has already been reported.
*   If not, open a new issue and provide the following information:
    *   A clear and concise description of the bug.
    *   Steps to reproduce the behavior.
    *   Expected behavior.
    *   Actual behavior.
    *   Screenshots or error messages if applicable.
    *   Your operating system, browser, and application version.

### 2.2. Suggesting Enhancements

*   We welcome suggestions for new features or improvements.
*   Open an issue to discuss your idea. Clearly describe the enhancement and its potential benefits.

### 2.3. Contributing Code

1.  **Fork the Repository**: Start by forking the `Steynzville/ThermaCoreApp` repository to your GitHub account.
2.  **Clone Your Fork**: Clone your forked repository to your local machine.
    ```bash
git clone https://github.com/YOUR_USERNAME/ThermaCoreApp.git
cd ThermaCoreApp
    ```
3.  **Create a New Branch**: Create a new branch for your feature or bug fix. Use a descriptive name (e.g., `feature/add-dark-mode`, `fix/login-bug`).
    ```bash
git checkout -b feature/your-feature-name
    ```
4.  **Set Up Development Environment**: Follow the instructions in the [Getting Started Guide](/docs/Getting_Started_Guide_for_New_Developers.md) to set up your local development environment.
5.  **Make Your Changes**: Implement your feature or fix. Ensure your code adheres to the [Code Style Guidelines](/docs/Code_Style_Guidelines.md).
6.  **Write Tests**: Add or update tests to cover your changes. Refer to the [Testing Guidelines](/docs/Testing_Guidelines.md).
7.  **Run Tests**: Ensure all existing tests pass, along with your new tests.
    *   **Backend**: `pytest backend/app/tests`
    *   **Frontend**: `pnpm test`
8.  **Format and Lint Your Code**: Ensure your code is properly formatted and passes linting checks.
    *   **Backend**: Use `flake8` or `pylint`.
    *   **Frontend**: `pnpm run format` and `pnpm run lint:fix`
9.  **Commit Your Changes**: Write clear and concise commit messages following the [Code Style Guidelines](/docs/Code_Style_Guidelines.md) (e.g., `feat: add user profile page`, `fix: resolve unit status display issue`).
    ```bash
git add .
git commit -m "feat: your commit message"
    ```
10. **Push to Your Fork**: Push your changes to your forked repository on GitHub.
    ```bash
git push origin feature/your-feature-name
    ```
11. **Create a Pull Request (PR)**: Open a pull request from your branch to the `main` branch of the original `Steynzville/ThermaCoreApp` repository.
    *   Provide a clear title and description for your PR.
    *   Reference any related issues (e.g., `Closes #123`).
    *   Be prepared to discuss your changes and address feedback from maintainers.

## 3. Code Review Process

*   All code contributions will be reviewed by at least one project maintainer.
*   Reviewers will check for code quality, adherence to guidelines, test coverage, and overall impact.
*   Be responsive to feedback and willing to iterate on your changes.

## 4. Documentation

*   If your changes introduce new features or modify existing functionality, please update the relevant documentation (e.g., API documentation, Getting Started Guide).
*   Ensure all documentation is clear, accurate, and up-to-date.

## 5. Protocol Implementation Standards

*   When contributing to or extending protocol integrations (MQTT, OPC UA, Modbus, DNP3), ensure strict adherence to the [Protocol Implementation Standards](/docs/Protocol_Implementation_Standards.md).
*   Pay close attention to security, error handling, and configuration aspects outlined in the standards.

Thank you for your contributions!
