/**
 * Test workflow configuration and CI/CD setup for frontend
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Workflow Configuration', () => {
  it('should have a valid workflow file', () => {
    const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'checks.yml');
    expect(fs.existsSync(workflowPath)).toBe(true);
  });

  it('should have workflow content', () => {
    const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'checks.yml');
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    
    expect(workflowContent).toBeTruthy();
    expect(workflowContent).toContain('jobs:');
  });

  it('should have frontend test step in workflow', () => {
    const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'checks.yml');
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    
    expect(workflowContent).toContain('build-and-test:');
    expect(workflowContent).toContain('Run Frontend Tests');
  });
});

describe('Project Structure', () => {
  it('should have package.json', () => {
    const packagePath = path.join(process.cwd(), 'package.json');
    expect(fs.existsSync(packagePath)).toBe(true);
  });

  it('should have test script configured', () => {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.test).toBeDefined();
  });

  it('should have vite config', () => {
    const vitePath = path.join(process.cwd(), 'vite.config.js');
    expect(fs.existsSync(vitePath)).toBe(true);
  });
});
