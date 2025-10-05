# Deployment Guide

## Overview

This project uses GitHub Actions for automated CI/CD pipeline. The deployment process includes:
- Automated testing on every push and pull request
- TypeScript compilation and build validation
- Production deployment to GitHub Pages (configurable for other platforms)
- Build artifact caching for performance
- Deployment notifications (optional)

## Prerequisites

### Repository Configuration

1. **Enable GitHub Pages** (if using GitHub Pages):
   - Go to Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` / `root`

2. **Configure Repository Secrets**:
   - Go to Settings → Secrets and variables → Actions
   - Add required secrets based on your deployment platform

### Required Secrets

#### For GitHub Pages (Default)
- No additional secrets required (uses `GITHUB_TOKEN`)

#### For Vercel
```
VERCEL_TOKEN        # Get from: https://vercel.com/account/tokens
VERCEL_PROJECT_ID   # Get from: Project Settings → General
VERCEL_ORG_ID       # Get from: Team Settings → General
```

#### For Netlify
```
NETLIFY_AUTH_TOKEN  # Get from: User Settings → Applications
NETLIFY_SITE_ID     # Get from: Site Settings → General
```

#### For Notifications (Optional)
```
DISCORD_WEBHOOK     # Discord server → Settings → Integrations → Webhooks
SLACK_WEBHOOK       # Slack App → Incoming Webhooks
```

## Deployment Workflow

### Automatic Deployment

The deployment pipeline triggers automatically on:
- **Push to `main` branch**: Full CI/CD pipeline with deployment
- **Pull Request to `main`**: CI tests only, no deployment

### Manual Deployment

To manually trigger deployment:
1. Go to Actions tab
2. Select "CI/CD Pipeline" workflow
3. Click "Run workflow"
4. Select branch and run

## Pipeline Stages

### 1. Test Stage
```yaml
- Linting (ESLint)
- Type checking (TypeScript)
- Unit tests (Vitest)
- E2E tests (Playwright)
- Code coverage report
```

### 2. Build Stage
```yaml
- Install dependencies
- Build production bundle
- Optimize assets
- Generate source maps
- Check bundle size
```

### 3. Deploy Stage
```yaml
- Download build artifacts
- Deploy to hosting platform
- Update deployment URL
- Send status notifications
```

## Environment Configuration

### Local Development
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your values
nano .env.local

# Never commit .env.local!
```

### Production Environment
Configure via GitHub Secrets or hosting platform dashboard:
```
VITE_ENVIRONMENT=production
VITE_API_URL=https://api.production.com
```

## Platform-Specific Configuration

### GitHub Pages

1. **Enable in workflow** (already configured):
```yaml
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./dist
```

2. **Configure base URL** in `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/bmad_brock_bloken/', // Your repo name
})
```

### Vercel

1. **Uncomment Vercel section** in `.github/workflows/deploy.yml`
2. **Add secrets** to repository
3. **Configure** `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### Netlify

1. **Uncomment Netlify section** in `.github/workflows/deploy.yml`
2. **Add secrets** to repository
3. **Configure** `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"
```

## Monitoring

### Build Status
- Check badge in README: ![CI/CD Pipeline](badge.svg)
- GitHub Actions tab: https://github.com/[owner]/[repo]/actions

### Deployment Logs
- GitHub Actions: View workflow run details
- Vercel: https://vercel.com/[team]/[project]/deployments
- Netlify: https://app.netlify.com/sites/[site]/deploys

### Performance Monitoring
Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics for usage metrics

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check locally
npm run build
npm run typecheck
```

#### 2. Test Failures
```bash
# Run tests locally
npm test
npm run test:e2e
```

#### 3. Deployment Failures
- Check GitHub Actions logs
- Verify secrets are configured
- Ensure branch protection rules allow deployment

#### 4. Cache Issues
- Increment `CACHE_VERSION` in workflow
- Clear cache in Actions → Management → Caches

### Debug Locally

Use `act` to test workflows locally:
```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | bash

# Test workflow
act push -W .github/workflows/deploy.yml
```

## Security Best Practices

### ✅ DO
- Use GitHub Secrets for sensitive values
- Enable branch protection on `main`
- Require PR reviews before merge
- Use environment-specific secrets
- Rotate tokens regularly
- Enable 2FA on all accounts

### ❌ DON'T
- Hardcode secrets in code
- Commit `.env` files
- Share deployment tokens
- Disable security checks
- Use personal access tokens in workflows

## Rollback Procedures

See [Rollback Procedures](./rollback-procedures.md) for detailed rollback instructions.

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Review this documentation
3. Check platform-specific docs
4. Contact DevOps team

## References

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [GitHub Pages Documentation](https://docs.github.com/pages)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)