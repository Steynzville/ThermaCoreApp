"""Test workflow configuration and CI/CD setup."""
from pathlib import Path
import os
import pytest

# Constants for search depth limits
MAX_PARENT_SEARCH_DEPTH = 5
MAX_REPO_ROOT_SEARCH_DEPTH = 10


def find_workflow_file(filename='checks.yml'):
    """
    Find a workflow file using robust path resolution with multiple fallbacks.
    
    This function attempts to locate workflow files in various ways to ensure
    reliability across different environments (local development, CI, etc.).
    
    Args:
        filename: The workflow filename to search for (default: 'checks.yml')
    
    Returns:
        pathlib.Path: The resolved path to the workflow file
        
    Raises:
        FileNotFoundError: If the workflow file cannot be found in any location
    """
    # Strategy 1: From the test file's perspective (relative navigation)
    test_file = Path(__file__).resolve()
    repo_root_from_test = test_file.parent.parent.parent.parent
    workflow_path = repo_root_from_test / '.github' / 'workflows' / filename
    if workflow_path.exists():
        return workflow_path
    
    # Strategy 2: From current working directory
    cwd_path = Path.cwd() / '.github' / 'workflows' / filename
    if cwd_path.exists():
        return cwd_path
    
    # Strategy 3: Search parent directories
    current = Path.cwd()
    for _ in range(MAX_PARENT_SEARCH_DEPTH):
        candidate = current / '.github' / 'workflows' / filename
        if candidate.exists():
            return candidate
        parent = current.parent
        if parent == current:  # Reached filesystem root
            break
        current = parent
    
    # Strategy 4: Repository root detection via common markers
    # Look for markers like .git, .github, package.json, etc.
    current = Path(__file__).resolve()
    for _ in range(MAX_REPO_ROOT_SEARCH_DEPTH):
        parent = current.parent
        if parent == current:  # Reached filesystem root
            break
        # Check for repository root indicators
        if any((parent / marker).exists() for marker in ['.git', 'package.json', 'pnpm-lock.yaml']):
            candidate = parent / '.github' / 'workflows' / filename
            if candidate.exists():
                return candidate
        current = parent
    
    # Strategy 5: Environment variable (if set in CI or other environments)
    if 'GITHUB_WORKSPACE' in os.environ:
        workspace_path = Path(os.environ['GITHUB_WORKSPACE']) / '.github' / 'workflows' / filename
        if workspace_path.exists():
            return workspace_path
    
    # If all strategies fail, raise an error with helpful information
    search_paths = [
        repo_root_from_test / '.github' / 'workflows' / filename,
        cwd_path,
        f'Parent directories up to {MAX_PARENT_SEARCH_DEPTH} levels',
        f'Repository root detection (up to {MAX_REPO_ROOT_SEARCH_DEPTH} levels)',
    ]
    if 'GITHUB_WORKSPACE' in os.environ:
        search_paths.append(f"GITHUB_WORKSPACE: {os.environ['GITHUB_WORKSPACE']}")
    
    raise FileNotFoundError(
        f"Could not find workflow file '{filename}'. Searched:\n" +
        "\n".join(f"  - {path}" for path in search_paths) +
        f"\n\nCurrent working directory: {Path.cwd()}\n" +
        f"Test file location: {test_file}"
    )


def _get_workflow_path():
    """Get the path to the workflow file using robust path resolution.
    
    Returns None if the file cannot be found (e.g., when running in Docker
    without the repository mounted).
    """
    try:
        return find_workflow_file('checks.yml')
    except FileNotFoundError:
        return None


def test_workflow_file_exists():
    """Test that the GitHub Actions workflow file exists."""
    workflow_path = _get_workflow_path()
    if workflow_path is None:
        pytest.skip("Workflow file not accessible in this environment (e.g., Docker container without repository mount)")
    assert workflow_path.exists(), f"Workflow file should exist at {workflow_path}"


def test_workflow_file_has_content():
    """Test that the workflow file has valid content."""
    workflow_path = _get_workflow_path()
    if workflow_path is None:
        pytest.skip("Workflow file not accessible in this environment (e.g., Docker container without repository mount)")
    
    workflow_content = workflow_path.read_text()
    
    assert workflow_content, "Workflow file should have content"
    assert 'jobs:' in workflow_content, "Workflow should have jobs defined"


def test_workflow_has_required_jobs():
    """Test that the workflow has required jobs."""
    workflow_path = _get_workflow_path()
    if workflow_path is None:
        pytest.skip("Workflow file not accessible in this environment (e.g., Docker container without repository mount)")
    
    workflow_content = workflow_path.read_text()
    
    assert 'build-and-test:' in workflow_content, "Workflow should have build-and-test job"
    assert 'python-quality-and-security:' in workflow_content, "Workflow should have python-quality-and-security job"


def test_python_environment():
    """Test that Python environment is set up correctly for tests."""
    import sys
    assert sys.version_info >= (3, 8), "Python version should be 3.8 or higher"


def test_backend_structure():
    """Test that backend structure is correct."""
    # Start from this test file and navigate to backend directory
    backend_path = Path(__file__).resolve().parent.parent.parent
    
    # Check for key directories
    assert (backend_path / 'app').exists(), "app directory should exist"
    assert (backend_path / 'app' / 'tests').exists(), "tests directory should exist"
    assert (backend_path / 'config.py').exists(), "config.py should exist"
