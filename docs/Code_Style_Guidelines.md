# Code Style Guidelines

Consistent code style is crucial for readability, maintainability, and collaboration within the ThermaCoreApp project. This document outlines the code style guidelines for both the Python backend and the React frontend.

## 1. General Principles

*   **Readability**: Code should be easy to read and understand by other developers.
*   **Consistency**: Adhere to existing patterns and styles within the codebase.
*   **Simplicity**: Prefer straightforward solutions over overly complex ones.
*   **Clarity**: Variable, function, and class names should be descriptive and unambiguous.
*   **DRY (Don't Repeat Yourself)**: Avoid redundant code.

## 2. Python Backend (Flask)

### 2.1. Formatting

*   **PEP 8**: Adhere to [PEP 8](https://www.python.org/dev/peps/pep-0008/) for all Python code. Use a linter like `flake8` or `pylint` to enforce this.
*   **Indentation**: 4 spaces for indentation.
*   **Line Length**: Limit all lines to a maximum of 79 characters.
*   **Blank Lines**: Use two blank lines to separate top-level function and class definitions. Use one blank line to separate method definitions inside a class.
*   **Imports**: Organize imports as follows:
    1.  Standard library imports.
    2.  Third-party imports.
    3.  Local application-specific imports.
    Sort alphabetically within each group. Use `isort` to automate this.

### 2.2. Naming Conventions

*   **Modules**: `lowercase_with_underscores`.
*   **Packages**: `lowercase_with_underscores`.
*   **Classes**: `CamelCase`.
*   **Functions/Methods**: `lowercase_with_underscores`.
*   **Variables**: `lowercase_with_underscores`.
*   **Constants**: `ALL_CAPS_WITH_UNDERSCORES`.
*   **Private Members**: Prefix with a single underscore (`_private_method`).

### 2.3. Docstrings and Comments

*   **Docstrings**: All modules, classes, and functions/methods should have docstrings following the [Sphinx style](https://sphinx-rtd-tutorial.readthedocs.io/en/latest/docstrings.html) or [Google style](https://google.github.io/styleguide/pyguide.html#pyguide-format-docstrings).
*   **Comments**: Use comments sparingly to explain *why* something is done, rather than *what* is being done (which should be clear from the code itself).

### 2.4. Type Hinting

*   Use [type hints](https://docs.python.org/3/library/typing.html) for function arguments and return values where appropriate to improve code clarity and enable static analysis.

### 2.5. Error Handling

*   Use specific exceptions rather than broad `except Exception` clauses. Implement custom exceptions for application-specific errors.
*   Ensure proper logging of errors and exceptions.

## 3. React Frontend

### 3.1. Formatting

*   **Prettier**: Use [Prettier](https://prettier.io/) to automatically format JavaScript, JSX, CSS, and HTML files. The `package.json` includes a `format` script: `pnpm run format`.
*   **ESLint**: Adhere to ESLint rules for code quality and consistency. The `package.json` includes `lint` and `lint:fix` scripts: `pnpm run lint` and `pnpm run lint:fix`.
*   **Indentation**: 2 spaces for JavaScript/JSX.
*   **Quotes**: Use single quotes for strings.
*   **Trailing Commas**: Use trailing commas where appropriate (e.g., in object literals, array literals).

### 3.2. Naming Conventions

*   **Components**: `PascalCase` (e.g., `MyComponent.jsx`).
*   **Hooks**: `useCamelCase` (e.g., `useMyHook.js`).
*   **Variables/Functions**: `camelCase`.
*   **Constants**: `ALL_CAPS_WITH_UNDERSCORES` (for global constants).
*   **CSS Classes**: Use a consistent naming convention like BEM (Block-Element-Modifier) or CSS Modules for component-specific styles.

### 3.3. Component Structure

*   **Functional Components**: Prefer functional components with React Hooks over class components.
*   **Props**: Destructure props at the top of the component function.
*   **JSX**: Use self-closing tags for components without children. Place one component per file.
*   **Styling**: Use Tailwind CSS classes for styling. For complex or custom styles, consider CSS Modules or styled-components if introduced.

### 3.4. State Management

*   **React Hooks**: Use `useState`, `useEffect`, `useContext`, etc., for managing component-level and shared state.
*   **Context API**: Use React Context for global state that needs to be accessed by many components (e.g., `AuthContext`, `ThemeContext`).

### 3.5. Imports

*   Organize imports alphabetically. The `eslint-plugin-simple-import-sort` is configured to help with this.
*   Group imports: React, third-party, components, utilities, styles.

### 3.6. Accessibility

*   Ensure all UI components are accessible. Use semantic HTML, provide `alt` attributes for images, and ensure keyboard navigation is functional.

## 4. Version Control (Git)

*   **Commit Messages**: Follow a consistent commit message convention (e.g., Conventional Commits). A good commit message should include a type (feat, fix, docs, style, refactor, test, chore) and a concise description.
    *   `feat`: A new feature
    *   `fix`: A bug fix
    *   `docs`: Documentation only changes
    *   `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semicolons, etc.)
    *   `refactor`: A code change that neither fixes a bug nor adds a feature
    *   `test`: Adding missing tests or correcting existing tests
    *   `chore`: Changes to the build process or auxiliary tools and libraries such as documentation generation
*   **Branching**: Use a branching strategy like Git Flow or GitHub Flow. Feature branches should be created from `main` (or `develop`) and merged back via pull requests.
*   **Pull Requests**: Require pull requests for all code changes. Ensure PRs are reviewed by at least one other developer before merging.
