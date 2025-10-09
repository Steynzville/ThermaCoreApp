"""Test workflow configuration and CI/CD setup."""
from pathlib import Path


def _get_workflow_path():
    """Get the path to the workflow file using robust path resolution."""
    # Start from this test file's location
    test_file = Path(__file__).resolve()
    # Navigate to the repository root (3 levels up from backend/app/tests/)
    repo_root = test_file.parent.parent.parent.parent
    # Construct path to workflow file
    workflow_path = repo_root / '.github' / 'workflows' / 'checks.yml'
    return workflow_path


def test_workflow_file_exists():
    """Test that the GitHub Actions workflow file exists."""
    workflow_path = _get_workflow_path()
    assert workflow_path.exists(), f"Workflow file should exist at {workflow_path}"


def test_workflow_file_has_content():
    """Test that the workflow file has valid content."""
    workflow_path = _get_workflow_path()
    
    workflow_content = workflow_path.read_text()
    
    assert workflow_content, "Workflow file should have content"
    assert 'jobs:' in workflow_content, "Workflow should have jobs defined"


def test_workflow_has_required_jobs():
    """Test that the workflow has required jobs."""
    workflow_path = _get_workflow_path()
    
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
