# Test Coverage Maintenance Guide

## Overview
This document outlines the process for maintaining and improving test coverage in the BMAD Brock Bloken project.

## Current Status
- **Target Coverage**: 90% statements, 85% branches, 80% functions, 90% lines
- **Current Coverage**: ~88% (approaching target)
- **Test Framework**: Vitest with @vitest/coverage-v8

## Coverage Monitoring

### Local Development
```bash
# Run tests with coverage
npm run test:coverage

# Generate detailed report
node scripts/coverage-report.js

# View HTML report
open coverage/lcov-report/index.html
```

### Continuous Integration
- Coverage runs automatically on all PRs to main branch
- Failed coverage thresholds block merge
- Coverage reports are posted as PR comments

## Coverage Standards

### Mandatory Coverage Areas
1. **Core Game Logic** (95%+ target)
   - GameLoop, GameState, ScoreSystem
   - Level progression and conditions
   - Critical game mechanics

2. **Physics System** (90%+ target)
   - Collision detection
   - Movement calculations
   - Boundary handling

3. **State Management** (90%+ target)
   - Store actions and mutations
   - State synchronization
   - Persistence logic

### Optional Coverage Areas
- UI components (visual testing preferred)
- Development utilities
- Mock implementations

## Writing Effective Tests

### Test Structure
```typescript
describe('ComponentName', () => {
  describe('Feature/Method', () => {
    it('should handle normal case', () => {
      // Arrange → Act → Assert
    });
    
    it('should handle edge case', () => {
      // Test boundaries
    });
    
    it('should handle error case', () => {
      // Test error paths
    });
  });
});
```

### Coverage Best Practices
1. **Branch Coverage**: Test all conditional paths
2. **Edge Cases**: Test boundary conditions
3. **Error Paths**: Test error handling
4. **Integration**: Test component interactions
5. **Performance**: Include performance assertions

## Coverage Improvement Process

### Weekly Review
1. Run coverage report
2. Identify modules below threshold
3. Prioritize gaps by risk level
4. Create improvement tasks

### Before Release
1. Ensure all thresholds met
2. Review uncovered critical paths
3. Document any accepted gaps
4. Update coverage badges

## Common Coverage Gaps

### Typical Uncovered Areas
- Error handling branches
- Defensive programming checks
- Rarely executed code paths
- Complex conditional logic
- Async error cases

### How to Address
1. **Error Paths**: Use `.throws()` and error simulation
2. **Async Code**: Use proper async test patterns
3. **Conditionals**: Test all branches explicitly
4. **Edge Cases**: Use boundary value analysis

## Tools and Scripts

### Coverage Scripts
- `npm run test:coverage` - Run tests with coverage
- `node scripts/coverage-report.js` - Generate detailed report
- `node scripts/update-badges.js` - Update README badges

### Coverage Files
- `coverage/lcov-report/` - HTML coverage report
- `coverage/coverage-summary.json` - JSON summary
- `coverage/COVERAGE.md` - Markdown report
- `coverage/badges.json` - Badge URLs

## Troubleshooting

### Common Issues
1. **Canvas Mocking**: Use CanvasMockFactory
2. **Async Tests**: Ensure proper async/await
3. **Timer Tests**: Use vi.useFakeTimers()
4. **Module Mocking**: Use vi.mock() correctly

### Performance Issues
- Use test.concurrent() for parallel tests
- Optimize test data creation
- Avoid unnecessary setup/teardown
- Use test.skip() for slow integration tests in watch mode

## Future Improvements

### Planned Enhancements
1. Mutation testing with Stryker
2. Visual regression testing
3. Performance benchmarking
4. Contract testing for APIs
5. Security testing integration

### Coverage Goals
- Q1 2025: Achieve 90% overall coverage
- Q2 2025: Implement mutation testing
- Q3 2025: Add visual regression tests
- Q4 2025: Reach 95% critical path coverage

## Resources

### Documentation
- [Vitest Coverage Docs](https://vitest.dev/guide/coverage)
- [Testing Best Practices](https://testingjavascript.com)
- [Coverage Metrics Guide](https://martinfowler.com/bliki/TestCoverage.html)

### Team Contacts
- Tech Lead: Review coverage reports
- QA Team: Coverage requirements
- DevOps: CI/CD configuration

---

*Last Updated: 2025-01-24*
*Next Review: 2025-02-01*