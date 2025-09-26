# Contributing to ThermaCore SCADA Platform

Thank you for your interest in contributing to ThermaCore! This guide will help you get started with contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Prerequisites

- **Node.js** 16+ with pnpm package manager
- **Python** 3.9+ with pip
- **PostgreSQL** 13+ with TimescaleDB extension
- **Git** for version control
- A **GitHub account** and familiarity with Git workflows

### Development Environment Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/ThermaCoreApp.git
   cd ThermaCoreApp
   git remote add upstream https://github.com/Steynzville/ThermaCoreApp.git
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   pnpm install
   
   # Backend
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your database credentials
   ```

4. **Initialize the database**
   ```bash
   cd backend
   flask init-db
   cd ..
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Frontend
   pnpm dev
   
   # Terminal 2: Backend
   cd backend && python run.py
   ```

## 🔄 Development Workflow

### Branch Management

- **`main`** - Production-ready code
- **`develop`** - Integration branch for features
- **`feature/*`** - New features
- **`bugfix/*`** - Bug fixes
- **`hotfix/*`** - Critical production fixes

### Feature Development Process

1. **Create a feature branch**
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following our [coding standards](#coding-standards)
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Frontend tests
   pnpm test
   pnpm lint
   
   # Backend tests
   cd backend
   pytest
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Convention

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

**Examples:**
- `feat(api): add unit status endpoint`
- `fix(ui): resolve login form validation issue`
- `docs: update API documentation`

## 💻 Coding Standards

### Frontend (React/TypeScript)

- **Style Guide**: Use ESLint configuration provided
- **Formatting**: Prettier with the provided configuration
- **Components**: Use functional components with hooks
- **State Management**: React Context API for global state
- **Styling**: Tailwind CSS for styling
- **File Structure**: Feature-based organization

**Example component structure:**
```typescript
// components/FeatureName/FeatureName.tsx
import React from 'react';

interface FeatureNameProps {
  // Props interface
}

export const FeatureName: React.FC<FeatureNameProps> = ({ prop }) => {
  // Component logic
  
  return (
    <div className="feature-container">
      {/* Component JSX */}
    </div>
  );
};
```

### Backend (Python/Flask)

- **Style Guide**: Follow PEP 8
- **Type Hints**: Use type hints for function parameters and returns
- **Documentation**: Use docstrings for all functions and classes
- **Error Handling**: Proper exception handling with appropriate HTTP status codes
- **Database**: Use SQLAlchemy ORM, avoid raw SQL

**Example function structure:**
```python
def create_user(user_data: dict) -> dict:
    """
    Create a new user in the system.
    
    Args:
        user_data: Dictionary containing user information
        
    Returns:
        Dictionary containing created user data
        
    Raises:
        ValueError: If user data is invalid
        DatabaseError: If database operation fails
    """
    # Function implementation
```

### Database

- **Migrations**: Always create migration scripts for schema changes
- **Naming**: Use snake_case for tables and columns
- **Indexes**: Add appropriate indexes for query performance
- **Constraints**: Use foreign key constraints and validation

## 🧪 Testing Guidelines

### Frontend Testing

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows (when applicable)
- **Coverage**: Aim for 80%+ test coverage

```bash
pnpm test              # Run all tests
pnpm test:coverage     # Run with coverage report
pnpm test:watch        # Run tests in watch mode
```

### Backend Testing

- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test API endpoints
- **Database Tests**: Test database operations
- **Coverage**: Aim for 90%+ test coverage

```bash
pytest                 # Run all tests
pytest --cov=app      # Run with coverage
pytest -v             # Verbose output
```

### Test Structure

```python
# Backend test example
def test_create_user_success():
    """Test successful user creation."""
    # Arrange
    user_data = {'username': 'testuser', 'email': 'test@example.com'}
    
    # Act
    result = create_user(user_data)
    
    # Assert
    assert result['username'] == 'testuser'
    assert 'id' in result
```

## 🔍 Pull Request Process

### Before Submitting

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

2. **Run all tests**
   ```bash
   pnpm test && cd backend && pytest
   ```

3. **Check code quality**
   ```bash
   pnpm lint
   cd backend && flake8 app
   ```

### PR Requirements

- [ ] **Clear title and description** explaining the changes
- [ ] **Tests added** for new functionality
- [ ] **Documentation updated** if applicable
- [ ] **No merge conflicts** with the target branch
- [ ] **All CI checks passing**
- [ ] **Code review** by at least one maintainer

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## 🐛 Issue Guidelines

### Bug Reports

Use the bug report template and include:

- **Environment details** (OS, browser, versions)
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Screenshots** or error logs if applicable
- **Minimal reproduction example**

### Feature Requests

Use the feature request template and include:

- **Clear problem statement** and user story
- **Proposed solution** with implementation details
- **Alternative solutions** considered
- **Impact assessment** on existing functionality

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `documentation` - Documentation needs
- `good-first-issue` - Good for newcomers
- `help-wanted` - Extra attention needed
- `priority:high` - High priority items

## 🎯 Areas for Contribution

### High Priority
- Performance optimizations
- Security enhancements
- Test coverage improvements
- Documentation updates

### Medium Priority
- UI/UX improvements
- New SCADA protocol support
- Advanced analytics features
- Mobile responsiveness

### Good First Issues
- Documentation fixes
- Code style improvements
- Minor bug fixes
- Test additions

## 🤝 Community

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and ideas
- **Pull Requests** - Code contributions and reviews

### Recognition

Contributors are recognized in:
- **CHANGELOG.md** - Release notes
- **README.md** - Contributors section
- **GitHub contributors page**

Thank you for contributing to ThermaCore! 🚀