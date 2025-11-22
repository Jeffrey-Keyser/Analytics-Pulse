# Contributing to Analytics-Pulse

Thank you for your interest in contributing to Analytics-Pulse! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Issue Reporting](#issue-reporting)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

### Our Pledge

We pledge to make participation in Analytics-Pulse a harassment-free experience for everyone, regardless of:
- Age
- Body size
- Disability
- Ethnicity
- Gender identity and expression
- Level of experience
- Nationality
- Personal appearance
- Race
- Religion
- Sexual identity and orientation

### Our Standards

**Positive behavior includes**:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards others

**Unacceptable behavior includes**:
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team. All complaints will be reviewed and investigated promptly and fairly.

## Getting Started

### Prerequisites

Ensure you have these tools installed:

```bash
# Node.js 18+ and npm
node --version  # 18.x or higher
npm --version

# Docker
docker --version

# PostgreSQL client (for database work)
psql --version

# Git
git --version
```

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/Analytics-Pulse.git
cd Analytics-Pulse
```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/Jeffrey-Keyser/Analytics-Pulse.git
```

### Local Development Setup

**Option 1: Docker (Recommended)**

```bash
# Copy environment file
cp .env.docker.example .env.docker

# Add your GitHub token
echo "GITHUB_TOKEN=your_github_pat" >> .env.docker

# Start development environment
./scripts/docker-dev.sh
```

**Option 2: Manual Setup**

```bash
# Install server dependencies
cd server
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
cd db
./deploy.sh
cd ..

# Start server
npm run dev
```

```bash
# Install client dependencies
cd ../client
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Start client
npm run dev
```

### Verify Setup

**Server** (http://localhost:3001):
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","database":"connected"}
```

**Client** (http://localhost:3002):
- Open browser to http://localhost:3002
- Should see Analytics-Pulse login page

## Development Workflow

### 1. Create a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

**Branch Naming Conventions**:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/changes
- `chore/` - Maintenance tasks

### 2. Make Changes

**Best Practices**:
- Write clean, readable code
- Follow existing code style
- Add tests for new features
- Update documentation as needed
- Keep commits focused and atomic

### 3. Test Your Changes

**Run Tests**:

```bash
# Server tests
cd server
npm test                # All tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage

# Client tests
cd client
npm test                # All tests
npm run coverage        # With coverage
```

**Linting**:

```bash
# Server
cd server
npm run lint

# Client (if lint script exists)
cd client
npm run lint
```

**Manual Testing**:
- Test affected features in the UI
- Verify API endpoints with Postman/curl
- Check database migrations work
- Ensure no breaking changes

### 4. Commit Changes

Follow our [commit message guidelines](#commit-message-guidelines):

```bash
git add .
git commit -m "feat: add campaign comparison feature"
```

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
gh pr create --title "Add campaign comparison feature" --body "Description of changes"
```

## Coding Standards

### TypeScript

**General**:
- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types
- Define interfaces for all data structures
- Use meaningful variable names

**Example**:

```typescript
// ✅ Good
interface CreateProjectDto {
  name: string;
  domain: string;
  description?: string;
}

async function createProject(data: CreateProjectDto): Promise<Project> {
  const project = await projectsDal.create(data);
  return project;
}

// ❌ Bad
async function createProject(data: any) {
  const project = await projectsDal.create(data);
  return project;
}
```

### React

**Component Structure**:

```typescript
// ✅ Good - Functional component with TypeScript
interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  return (
    <div className={styles.card}>
      <h3>{project.name}</h3>
      <button onClick={() => onDelete(project.id)}>Delete</button>
    </div>
  );
}
```

**Hooks**:
- Use functional components with hooks
- Extract custom hooks for reusable logic
- Follow hooks rules (no conditionals, loops)

### CSS

**Use CSS Modules**:

```typescript
import styles from './ProjectCard.module.css';

export function ProjectCard() {
  return <div className={styles.card}>...</div>;
}
```

### File Organization

**Server**:
```
server/
├── src/
│   ├── routes/          # API route definitions
│   ├── controllers/     # Request handlers (if complex)
│   ├── dal/             # Data Access Layer
│   ├── middleware/      # Express middleware
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
└── tests/
    └── __tests__/
        ├── unit/        # Unit tests
        └── integration/ # Integration tests
```

**Client**:
```
client/src/
├── components/          # Presentational components
├── containers/          # Container components (connected to Redux)
├── reducers/            # Redux slices (RTK Query)
├── models/              # TypeScript interfaces
├── utils/               # Utility functions
└── styles/              # Global styles
```

## Testing Guidelines

### Unit Tests

**Test individual functions and components**:

```typescript
// server/tests/__tests__/unit/hashIp.test.ts
import { hashIp } from '../../src/utils/hashIp';

describe('hashIp', () => {
  it('should hash IP address', () => {
    const hash = hashIp('192.168.1.1');
    expect(hash).toHaveLength(64); // SHA-256 = 64 hex chars
  });

  it('should produce consistent hashes', () => {
    const hash1 = hashIp('192.168.1.1');
    const hash2 = hashIp('192.168.1.1');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different IPs', () => {
    const hash1 = hashIp('192.168.1.1');
    const hash2 = hashIp('192.168.1.2');
    expect(hash1).not.toBe(hash2);
  });
});
```

### Integration Tests

**Test API endpoints**:

```typescript
// server/tests/__tests__/integration/projects.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('POST /api/v1/projects', () => {
  it('should create a new project', async () => {
    const response = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: 'Test Project',
        domain: 'example.com'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Test Project');
  });

  it('should return 400 for invalid data', async () => {
    const response = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        name: '', // Invalid: empty name
        domain: 'example.com'
      });

    expect(response.status).toBe(400);
  });
});
```

### Component Tests

**Test React components**:

```typescript
// client/src/components/__tests__/ProjectCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from '../ProjectCard';

describe('ProjectCard', () => {
  const mockProject = {
    id: '123',
    name: 'Test Project',
    domain: 'example.com'
  };

  it('should render project name', () => {
    render(<ProjectCard project={mockProject} onDelete={() => {}} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('should call onDelete when delete button clicked', () => {
    const onDelete = jest.fn();
    render(<ProjectCard project={mockProject} onDelete={onDelete} />);

    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('123');
  });
});
```

### Test Coverage

Aim for:
- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical paths covered
- **Component Tests**: All user interactions covered

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm test`)
- [ ] Code lints without errors (`npm run lint`)
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow guidelines
- [ ] Branch is up to date with `main`
- [ ] No merge conflicts

### PR Checklist

```markdown
## Description
[Describe what this PR does]

## Related Issue
Closes #123

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
- [ ] Dependent changes merged
```

### Review Process

1. **Automated Checks**:
   - Tests must pass
   - Linting must pass
   - Build must succeed

2. **Code Review**:
   - At least one approval required
   - Address all review comments
   - Re-request review after changes

3. **Merge**:
   - Squash and merge (default)
   - Or merge commit (for large features)
   - Delete branch after merge

## Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

**Simple commit**:
```
feat: add campaign comparison feature
```

**With scope**:
```
fix(api): correct timezone handling in date ranges
```

**With body**:
```
feat(dashboard): add real-time active visitors card

Add a new card to the dashboard that shows the number of active visitors
in the last 5 minutes. Updates automatically every 30 seconds.
```

**Breaking change**:
```
feat(api)!: change analytics endpoint response format

BREAKING CHANGE: The analytics endpoint now returns data in a different
structure. Update your client code to use the new format.
```

**Closing issue**:
```
fix(tracking): prevent duplicate event submissions

Closes #123
```

## Issue Reporting

### Bug Reports

**Use the bug report template**:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment**
- OS: [e.g., macOS 13.0]
- Browser: [e.g., Chrome 120]
- Version: [e.g., 1.0.0]

**Additional context**
Any other relevant information.
```

### Feature Requests

**Use the feature request template**:

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features you've considered.

**Additional context**
Any other context or screenshots.
```

### Security Issues

**DO NOT** create public issues for security vulnerabilities!

Instead, email: security@yourdomain.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Documentation

### When to Update Documentation

Update documentation when you:
- Add new features
- Change existing behavior
- Fix bugs that affect documented behavior
- Add new API endpoints
- Change configuration options

### Documentation Files

- **README.md**: Project overview, quick start
- **GETTING_STARTED.md**: Detailed setup guide
- **API_REFERENCE.md**: Complete API documentation
- **TRACKING_GUIDE.md**: JavaScript library docs
- **DEPLOYMENT.md**: Infrastructure deployment
- **ARCHITECTURE.md**: System design
- **PRIVACY.md**: Privacy practices
- **CONTRIBUTING.md**: This file

### Code Comments

**Add comments for**:
- Complex logic
- Non-obvious decisions
- Workarounds for bugs
- Performance optimizations
- Security considerations

**Don't comment**:
- Obvious code
- What the code does (use meaningful names instead)
- Redundant information

**Example**:

```typescript
// ✅ Good - explains WHY
// Use bcrypt with cost factor 10 for security/performance balance
const hashedKey = await bcrypt.hash(apiKey, 10);

// ❌ Bad - explains WHAT (already obvious)
// Hash the API key using bcrypt
const hashedKey = await bcrypt.hash(apiKey, 10);

// ✅ Good - meaningful names, no comment needed
const isValidKey = await bcrypt.compare(providedKey, storedHash);
```

### JSDoc for APIs

```typescript
/**
 * Create a new analytics project.
 *
 * @param data - Project creation data
 * @returns Created project with generated ID
 * @throws {ValidationError} If data is invalid
 * @throws {DatabaseError} If database operation fails
 *
 * @example
 * ```typescript
 * const project = await createProject({
 *   name: 'My Website',
 *   domain: 'example.com'
 * });
 * ```
 */
async function createProject(data: CreateProjectDto): Promise<Project> {
  // Implementation
}
```

## Community

### Where to Get Help

- **GitHub Discussions**: [https://github.com/Jeffrey-Keyser/Analytics-Pulse/discussions](https://github.com/Jeffrey-Keyser/Analytics-Pulse/discussions)
- **GitHub Issues**: [https://github.com/Jeffrey-Keyser/Analytics-Pulse/issues](https://github.com/Jeffrey-Keyser/Analytics-Pulse/issues)
- **Documentation**: [https://github.com/Jeffrey-Keyser/Analytics-Pulse](https://github.com/Jeffrey-Keyser/Analytics-Pulse)

### Communication Guidelines

- Be respectful and professional
- Stay on topic
- Provide context and details
- Search before asking (avoid duplicates)
- Use clear, concise language
- Include code examples when relevant
- Follow up on your questions/issues

### Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes
- Special thanks in README (for significant contributions)

## License

By contributing to Analytics-Pulse, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing, please:
1. Check this guide
2. Search GitHub Discussions
3. Ask in GitHub Discussions
4. Contact: contribute@yourdomain.com

---

**Thank you for contributing to Analytics-Pulse!** 🎉

Your contributions help make privacy-first analytics accessible to everyone.
