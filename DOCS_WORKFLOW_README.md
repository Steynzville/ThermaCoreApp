# Documentation Generation Workflow

This repository includes an automated GitHub Actions workflow that generates and deploys documentation to the `steynzville/docs` repository using Mintlify and Netlify.

## Overview

The workflow (`docs-generation.yml`) automatically:

1. **Triggers on push to main branch** - Runs whenever code is merged to the main branch
2. **Generates documentation** - Uses Mintlify CLI to create comprehensive documentation from code and README files
3. **Pushes to docs repository** - Updates the `steynzville/docs` repository with generated content
4. **Enables Netlify deployment** - Compatible with Netlify's auto-deploy feature
5. **Optional API deployment** - Can optionally trigger Mintlify API deployment

## Required Secrets

The workflow requires the following secrets to be configured in the repository settings:

### Required Secrets

- **`DOCS_REPO_TOKEN`**: Personal Access Token (PAT) with write access to the `steynzville/docs` repository
  - Go to GitHub Settings > Developer settings > Personal access tokens
  - Create a token with `repo` scope
  - Add the token as a repository secret in this repository

### Optional Secrets

- **`MINTIFY_API_KEY`**: Mintlify API key for direct deployment
  - Obtain from your Mintlify dashboard
  - Add as a repository secret if you want to use Mintlify API deployment
  - If not provided, the workflow relies on Netlify auto-deployment

## Configuration

### Mintlify Configuration

The workflow uses the `mint.json` file in the root directory to configure the documentation site:

- **Site branding**: Logo, colors, favicon
- **Navigation structure**: Pages and sections organization
- **External links**: GitHub, support, community links
- **Analytics**: Google Analytics integration (configure `measurementId`)

### Netlify Setup

To enable Netlify auto-deployment on the docs repository:

1. **Connect docs repository to Netlify**
   - Go to Netlify dashboard
   - Add new site from Git
   - Connect to `steynzville/docs` repository

2. **Configure build settings**
   - Build command: `mintlify build`
   - Publish directory: `_site` (or as configured by Mintlify)
   - Base directory: `thermacore` (where the docs are placed)

3. **Enable auto-deploy**
   - Netlify will automatically deploy when changes are pushed to the docs repository

## Workflow Details

### Generated Documentation

The workflow automatically generates the following documentation:

- **`introduction.mdx`**: Project overview and features
- **`quickstart.mdx`**: Quick start guide for developers
- **`installation.mdx`**: Detailed installation instructions
- **`api-reference/`**: API endpoint documentation
  - Authentication endpoints
  - User management APIs
  - Units/SCADA APIs
- **`backend/`**: Backend documentation
  - Architecture overview
  - Setup and configuration
  - Testing strategies

### Documentation Structure

```
docs/
├── introduction.mdx
├── quickstart.mdx
├── installation.mdx
├── api-reference/
│   ├── authentication.mdx
│   ├── users.mdx
│   └── units.mdx
└── backend/
    ├── overview.mdx
    ├── setup.mdx
    └── testing.mdx
```

### Workflow Steps

1. **Repository Checkout**: Checks out the current repository
2. **Environment Setup**: Installs Node.js and Mintlify CLI
3. **Dependency Installation**: Installs project dependencies
4. **Documentation Generation**: Creates/updates documentation files
5. **Docs Repository Checkout**: Clones the docs repository
6. **Content Copy**: Copies generated docs to the docs repository
7. **Commit and Push**: Updates the docs repository
8. **Optional API Deployment**: Triggers Mintlify API if configured
9. **Deployment Summary**: Provides workflow summary

## Customization

### Adding New Documentation

To add new documentation pages:

1. **Modify the workflow** (`docs-generation.yml`):
   - Add new file generation steps in the "Generate documentation" step
   - Update the Mintlify configuration to include new pages

2. **Update `mint.json`**:
   - Add new pages to the navigation structure
   - Configure appropriate grouping and ordering

### Customizing Documentation Content

The workflow generates documentation from:
- README files in the repository
- Hardcoded templates in the workflow
- Project structure and code

To customize content:
- Edit the documentation generation section in the workflow
- Modify the content templates
- Update the Mintlify configuration

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify `DOCS_REPO_TOKEN` is correctly configured
   - Ensure the token has appropriate permissions

2. **Build Failures**
   - Check Mintlify CLI installation
   - Verify `mint.json` configuration is valid
   - Review workflow logs for specific errors

3. **Netlify Deployment Issues**
   - Confirm Netlify is connected to the docs repository
   - Check build settings and directory configuration
   - Verify base directory is set to `thermacore`

### Debugging

To debug issues:
1. Check the Actions tab for workflow run details
2. Review the step-by-step logs
3. Verify secrets are properly configured
4. Test Mintlify configuration locally:
   ```bash
   npx mintlify dev
   ```

## Security Considerations

- **Repository Secrets**: Never commit secrets to the repository
- **Token Permissions**: Use minimal necessary permissions for the docs repository token
- **Access Control**: Restrict workflow permissions appropriately
- **Secret Rotation**: Regularly rotate authentication tokens

## Maintenance

### Regular Tasks

- **Review generated documentation** after major code changes
- **Update Mintlify configuration** as needed
- **Monitor workflow success** and address failures promptly
- **Keep secrets up to date** and rotate periodically

### Version Updates

- **Mintlify CLI**: Update to latest version periodically
- **GitHub Actions**: Keep action versions current
- **Dependencies**: Update Node.js and other dependencies as needed

---

For questions or issues with the documentation workflow, please:
1. Check the workflow logs in the Actions tab
2. Review this documentation
3. Contact the development team
4. Open an issue in the repository