# Rollback Procedures

## Overview

This document provides step-by-step procedures for rolling back deployments when issues are discovered in production.

## Quick Rollback Decision Tree

```
Production Issue Detected
├── Critical (Site Down, Security Breach)
│   └── Immediate Rollback → Method 1 (Git Revert)
├── Major (Feature Broken, Data Issues)
│   └── Quick Rollback → Method 2 (Platform Rollback)
└── Minor (UI Issues, Performance)
    └── Scheduled Rollback → Method 3 (Feature Flag)
```

## Rollback Methods

### Method 1: Git Revert (Fastest)

**Time to rollback: 2-5 minutes**

1. **Identify the problematic commit**:
```bash
# View recent commits
git log --oneline -10

# Find the deployment commit
git log --grep="deploy" --oneline
```

2. **Create a revert commit**:
```bash
# Revert the last commit
git revert HEAD

# Or revert a specific commit
git revert <commit-hash>

# Push to trigger new deployment
git push origin main
```

3. **Verify deployment**:
- Check GitHub Actions for deployment status
- Verify site is working at production URL

### Method 2: Platform-Specific Rollback

#### GitHub Pages
```bash
# Switch to gh-pages branch
git checkout gh-pages

# Reset to previous deployment
git log --oneline -5  # Find previous good commit
git reset --hard <previous-commit-hash>

# Force push
git push --force origin gh-pages
```

#### Vercel
1. Go to Vercel Dashboard
2. Navigate to Project → Deployments
3. Find last working deployment
4. Click "..." menu → "Promote to Production"
5. Confirm promotion

#### Netlify
1. Go to Netlify Dashboard
2. Navigate to Deploys
3. Find last working deployment
4. Click "Publish deploy"
5. Confirm publication

### Method 3: Feature Flag Disable

If using feature flags:
```typescript
// In your code
if (process.env.VITE_ENABLE_NEW_FEATURE === 'true') {
  // New feature code
}

// Disable via environment variable
VITE_ENABLE_NEW_FEATURE=false
```

## Emergency Procedures

### Immediate Site Recovery

1. **Stop current deployment** (if in progress):
   - Go to GitHub Actions
   - Find running workflow
   - Click "Cancel workflow"

2. **Deploy last known good version**:
```bash
# Find last good commit
git log --oneline --grep="stable" -1

# Create emergency branch
git checkout -b emergency-rollback <good-commit>

# Cherry-pick critical fixes only
git cherry-pick <fix-commit>

# Deploy emergency branch
git push origin emergency-rollback:main --force
```

3. **Notify team**:
   - Send notification to team channel
   - Create incident report
   - Schedule post-mortem

### Database Rollback (if applicable)

1. **Stop application** to prevent data corruption
2. **Restore database** from backup:
```bash
# Example for PostgreSQL
pg_restore -d dbname backup_file.dump
```
3. **Verify data integrity**
4. **Restart application**

## Rollback Validation

### Checklist After Rollback

- [ ] Site is accessible
- [ ] Core features work (login, navigation)
- [ ] No console errors in browser
- [ ] Monitoring shows normal metrics
- [ ] Team is notified
- [ ] Incident ticket created

### Testing After Rollback

```bash
# Run smoke tests
npm run test:smoke

# Check critical endpoints
curl -I https://production-url.com
curl https://production-url.com/api/health

# Verify static assets
curl -I https://production-url.com/assets/main.js
```

## Prevention Strategies

### Before Deployment

1. **Run full test suite**:
```bash
npm run test:all
npm run test:e2e
```

2. **Test build locally**:
```bash
npm run build
npm run preview
```

3. **Use staging environment**:
- Deploy to staging first
- Run acceptance tests
- Get approval before production

### Deployment Safety

1. **Progressive Rollout**:
```yaml
# In deployment config
strategy:
  type: canary
  canary:
    steps:
      - setWeight: 10  # 10% traffic
      - pause: {duration: 10m}
      - setWeight: 50  # 50% traffic
      - pause: {duration: 10m}
      - setWeight: 100 # Full traffic
```

2. **Blue-Green Deployment**:
- Deploy to blue environment
- Test blue environment
- Switch traffic from green to blue
- Keep green as instant rollback

## Post-Rollback Actions

### Immediate (Within 1 hour)
1. Confirm system stability
2. Notify stakeholders
3. Create incident report
4. Begin root cause analysis

### Short-term (Within 24 hours)
1. Complete RCA document
2. Create fix plan
3. Update monitoring/alerts
4. Schedule post-mortem meeting

### Long-term (Within 1 week)
1. Implement fixes
2. Update deployment procedures
3. Add regression tests
4. Train team on lessons learned

## Incident Report Template

```markdown
## Incident Report

**Date**: YYYY-MM-DD
**Time**: HH:MM (timezone)
**Duration**: X minutes/hours
**Severity**: Critical/Major/Minor

### Summary
Brief description of the issue

### Impact
- Users affected: X
- Features impacted: List
- Data loss: Yes/No

### Root Cause
Technical explanation

### Resolution
Steps taken to resolve

### Timeline
- HH:MM - Issue detected
- HH:MM - Team notified
- HH:MM - Rollback initiated
- HH:MM - Service restored

### Lessons Learned
- What went well
- What could be improved

### Action Items
- [ ] Task 1 - Owner
- [ ] Task 2 - Owner
```

## Contact Information

### Escalation Path

1. **Level 1**: On-call developer
   - Check #dev-oncall Slack channel
   - Page via PagerDuty

2. **Level 2**: Team Lead
   - Direct message/call

3. **Level 3**: Engineering Manager
   - Emergency contact list

### External Communications

- **Status Page**: Update at https://status.example.com
- **Customer Support**: Notify via #support channel
- **Social Media**: Coordinate with marketing team

## Tools and Resources

### Monitoring
- GitHub Actions: https://github.com/[owner]/[repo]/actions
- Application Logs: [Platform-specific dashboard]
- Error Tracking: [Sentry/LogRocket dashboard]

### Useful Commands

```bash
# Check deployment history
git log --grep="deploy" --oneline

# Compare versions
git diff <old-commit> <new-commit> --stat

# Show what changed
git show <commit-hash>

# List all tags (if using)
git tag -l

# Checkout specific version
git checkout tags/<version>
```

## Recovery Time Objectives

- **RTO** (Recovery Time Objective): 15 minutes
- **RPO** (Recovery Point Objective): Last successful deployment
- **MTTR** (Mean Time To Recovery): Track and improve

## Regular Drills

Schedule monthly rollback drills:
1. Pick random team member
2. Simulate production issue
3. Execute rollback procedure
4. Measure time and effectiveness
5. Update procedures based on learnings

---

**Remember**: It's better to rollback quickly and investigate later than to leave users with a broken experience. When in doubt, rollback!