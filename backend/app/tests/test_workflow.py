"""Test workflow configuration and CI/CD setup."""
import os


def test_workflow_file_exists():
    """Test that the GitHub Actions workflow file exists."""
    workflow_path = os.path.join(
        os.path.dirname(__file__),
        '../../../.github/workflows/checks.yml'
    )
    assert os.path.exists(workflow_path), "Workflow file should exist"


def test_workflow_file_has_content():
    """Test that the workflow file has valid content."""
    workflow_path = os.path.join(
        os.path.dirname(__file__),
        '../../../.github/workflows/checks.yml'
    )
    
    with open(workflow_path, 'r') as f:
        workflow_content = f.read()
    
    assert workflow_content, "Workflow file should have content"
    assert 'jobs:' in workflow_content, "Workflow should have jobs defined"


def test_workflow_has_required_jobs():
    """Test that the workflow has required jobs."""
    workflow_path = os.path.join(
        os.path.dirname(__file__),
        '../../../.github/workflows/checks.yml'
    )
    
    with open(workflow_path, 'r') as f:
        workflow_content = f.read()
    
    assert 'build-and-test:' in workflow_content, "Workflow should have build-and-test job"
    assert 'python-quality-and-security:' in workflow_content, "Workflow should have python-quality-and-security job"


def test_python_environment():
    """Test that Python environment is set up correctly for tests."""
    import sys
    assert sys.version_info >= (3, 8), "Python version should be 3.8 or higher"


def test_backend_structure():
    """Test that backend structure is correct."""
    backend_path = os.path.join(os.path.dirname(__file__), '../..')
    
    # Check for key directories
    assert os.path.exists(os.path.join(backend_path, 'app')), "app directory should exist"
    assert os.path.exists(os.path.join(backend_path, 'app', 'tests')), "tests directory should exist"
    assert os.path.exists(os.path.join(backend_path, 'config.py')), "config.py should exist"
