# Deployment Guide

This guide covers how to build, package, and deploy the Analytics Pulse tracking library to various distribution channels.

## Table of Contents

1. [Build Process](#build-process)
2. [Version Management](#version-management)
3. [Distribution Formats](#distribution-formats)
4. [NPM Package Publishing](#npm-package-publishing)
5. [CDN Hosting](#cdn-hosting)
6. [Self-Hosting](#self-hosting)
7. [CI/CD Integration](#cicd-integration)
8. [Release Checklist](#release-checklist)

## Build Process

### Prerequisites

- Node.js 14.0.0 or higher
- npm 6.0.0 or higher

### Build Commands

```bash
# Navigate to tracking-library directory
cd tracking-library

# Install dependencies (first time only)
npm install

# Build all distribution formats
npm run build

# Build only TypeScript types
npm run build:types

# Build only JavaScript bundles
npm run build:bundle

# Measure bundle sizes
npm run size
```

### Build Output

The build process generates the following files in `dist/`:

| File | Format | Description | Size (gzipped) |
|------|--------|-------------|----------------|
| `analytics-pulse.js` | UMD | Unminified browser build | ~6.3 KB |
| `analytics-pulse.min.js` | UMD | Minified browser build (production) | **6.43 KB** |
| `analytics-pulse.esm.js` | ESM | Modern bundlers (Webpack, Rollup, Vite) | ~12 KB |
| `analytics-pulse.cjs.js` | CJS | Node.js/CommonJS environments | ~12 KB |
| `index.d.ts` | TypeScript | Type definitions (entry point) | - |
| `*.d.ts` | TypeScript | Individual module type definitions | - |

All JavaScript files include:
- Source maps (`.map` files)
- License banner with version info
- ES2015 target for broad compatibility

## Version Management

### Semantic Versioning

The library follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes to public API
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

### Updating Version

```bash
# Update package.json version
npm version patch   # 0.1.0 → 0.1.1
npm version minor   # 0.1.0 → 0.2.0
npm version major   # 0.1.0 → 1.0.0

# Or manually edit package.json
{
  "version": "0.2.0"
}
```

The version number is automatically embedded in:
- File banners (via Rollup build)
- NPM package metadata
- Git tags (when using `npm version`)

### Pre-release Versions

```bash
# Alpha releases
npm version prerelease --preid=alpha  # 0.1.0-alpha.0

# Beta releases
npm version prerelease --preid=beta   # 0.1.0-beta.0

# Release candidates
npm version prerelease --preid=rc     # 0.1.0-rc.0
```

## Distribution Formats

### UMD (Universal Module Definition)

**File**: `dist/analytics-pulse.min.js`

**Use case**: Direct browser `<script>` tag

```html
<!-- Production (minified) -->
<script src="https://cdn.example.com/analytics-pulse.min.js"></script>
<script>
  AnalyticsPulse.init({ apiKey: 'your-key' });
</script>

<!-- Development (unminified, with source maps) -->
<script src="https://cdn.example.com/analytics-pulse.js"></script>
```

**Features**:
- Works with global `AnalyticsPulse` object
- AMD loader compatible (RequireJS)
- CommonJS compatible (older Node.js)
- No build step required

### ESM (ES Modules)

**File**: `dist/analytics-pulse.esm.js`

**Use case**: Modern bundlers (Webpack 5+, Rollup, Vite, Parcel)

```javascript
// Import everything
import * as AnalyticsPulse from '@analytics-pulse/tracking-library';

// Import specific functions
import { init, trackEvent, trackPageView } from '@analytics-pulse/tracking-library';

// Usage
init({ apiKey: 'your-key' });
trackEvent('button_click', { label: 'signup' });
```

**Features**:
- Tree-shaking support (unused code eliminated)
- Smaller bundle size when only using specific features
- Modern JavaScript syntax
- Preferred for modern applications

### CommonJS

**File**: `dist/analytics-pulse.cjs.js`

**Use case**: Node.js environments, older bundlers

```javascript
// Require the library
const AnalyticsPulse = require('@analytics-pulse/tracking-library');

// Or destructure
const { init, trackEvent } = require('@analytics-pulse/tracking-library');

// Usage
AnalyticsPulse.init({ apiKey: 'your-key' });
```

**Features**:
- Node.js compatible
- Webpack 4 and older bundlers
- Server-side rendering (SSR) support

### TypeScript Definitions

**File**: `dist/index.d.ts` (and related `.d.ts` files)

**Use case**: TypeScript projects

```typescript
import { init, trackEvent, AnalyticsConfig, EventPayload } from '@analytics-pulse/tracking-library';

const config: AnalyticsConfig = {
  apiKey: 'your-key',
  endpoint: 'https://api.example.com'
};

init(config);

const event: EventPayload = {
  name: 'purchase',
  properties: {
    amount: 99.99,
    currency: 'USD'
  }
};

trackEvent('purchase', event);
```

**Features**:
- Full type safety
- IntelliSense/autocomplete support
- Compile-time error checking
- Inline documentation

## NPM Package Publishing

### One-Time Setup

1. **Create NPM Account**: https://www.npmjs.com/signup

2. **Login to NPM**:
   ```bash
   npm login
   ```

3. **Verify Account**:
   ```bash
   npm whoami
   ```

4. **Configure Package Scope** (optional):
   - Public scope: `@analytics-pulse/tracking-library` (free)
   - Private scope: Requires paid NPM account

### Publishing Process

```bash
# 1. Ensure clean working directory
git status

# 2. Run tests
npm test

# 3. Build the library
npm run build

# 4. Verify package contents
npm pack --dry-run

# 5. Update version
npm version patch  # or minor, major

# 6. Publish to NPM
npm publish --access public

# 7. Push changes and tags
git push origin main --tags
```

### NPM Package Configuration

Key fields in `package.json`:

```json
{
  "name": "@analytics-pulse/tracking-library",
  "version": "0.1.0",
  "main": "dist/analytics-pulse.cjs.js",      // Node.js/CommonJS entry
  "module": "dist/analytics-pulse.esm.js",    // ESM entry (bundlers)
  "browser": "dist/analytics-pulse.min.js",   // Browser entry
  "types": "dist/index.d.ts",                 // TypeScript definitions
  "files": [
    "dist"                                     // Only include dist/ in package
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/Jeffrey-Keyser/Analytics-Pulse.git",
    "directory": "tracking-library"
  }
}
```

### Package Installation

Users can then install via:

```bash
# NPM
npm install @analytics-pulse/tracking-library

# Yarn
yarn add @analytics-pulse/tracking-library

# PNPM
pnpm add @analytics-pulse/tracking-library
```

### NPM Tags and Channels

```bash
# Publish to latest (default)
npm publish

# Publish to beta channel
npm publish --tag beta

# Publish to next channel (for major version previews)
npm publish --tag next

# Users can install specific channels
npm install @analytics-pulse/tracking-library@beta
```

## CDN Hosting

### Option 1: jsDelivr (NPM-backed, Recommended)

After publishing to NPM, the library is automatically available on jsDelivr:

```html
<!-- Latest version (auto-updates to latest patch) -->
<script src="https://cdn.jsdelivr.net/npm/@analytics-pulse/tracking-library@0.1/dist/analytics-pulse.min.js"></script>

<!-- Specific version (recommended for production) -->
<script src="https://cdn.jsdelivr.net/npm/@analytics-pulse/tracking-library@0.1.0/dist/analytics-pulse.min.js"></script>

<!-- With SRI (Subresource Integrity) for security -->
<script src="https://cdn.jsdelivr.net/npm/@analytics-pulse/tracking-library@0.1.0/dist/analytics-pulse.min.js"
        integrity="sha384-..."
        crossorigin="anonymous"></script>
```

**Features**:
- Automatic syncing from NPM
- Global CDN with fast edge caching
- Free for open-source projects
- HTTPS by default
- Supports version pinning

**Generate SRI Hash**:
```bash
# macOS/Linux
cat dist/analytics-pulse.min.js | openssl dgst -sha384 -binary | openssl base64 -A

# Or use online tool
# https://www.srihash.org/
```

### Option 2: UNPKG (NPM-backed)

Similar to jsDelivr but with different CDN infrastructure:

```html
<script src="https://unpkg.com/@analytics-pulse/tracking-library@0.1.0/dist/analytics-pulse.min.js"></script>
```

### Option 3: Custom CDN (AWS CloudFront, Cloudflare, etc.)

For production deployments with full control:

#### Upload to S3

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure

# Upload distribution files
aws s3 sync dist/ s3://your-cdn-bucket/analytics-pulse/0.1.0/ \
  --acl public-read \
  --cache-control "public, max-age=31536000, immutable"

# Upload latest symlink
aws s3 cp s3://your-cdn-bucket/analytics-pulse/0.1.0/analytics-pulse.min.js \
          s3://your-cdn-bucket/analytics-pulse/latest/analytics-pulse.min.js \
  --acl public-read \
  --cache-control "public, max-age=300"
```

#### CloudFront Distribution

Configure CloudFront to serve from S3:
- Origin: S3 bucket
- Viewer protocol: Redirect HTTP to HTTPS
- Caching: Use origin cache headers
- Gzip compression: Enabled

**Usage**:
```html
<script src="https://cdn.yourdomain.com/analytics-pulse/0.1.0/analytics-pulse.min.js"></script>
```

## Self-Hosting

For organizations that prefer to host the library themselves:

### 1. Build the Library

```bash
cd tracking-library
npm install
npm run build
```

### 2. Copy Distribution Files

```bash
# Copy to your web server's static assets directory
cp dist/analytics-pulse.min.js* /var/www/html/assets/js/
```

### 3. Serve with Proper Headers

**Nginx Configuration**:
```nginx
location /assets/js/ {
    # Enable gzip
    gzip on;
    gzip_types application/javascript;

    # Cache control
    add_header Cache-Control "public, max-age=31536000, immutable";

    # CORS (if needed for cross-domain)
    add_header Access-Control-Allow-Origin "*";

    # Security headers
    add_header X-Content-Type-Options "nosniff";
}
```

**Apache Configuration**:
```apache
<Directory "/var/www/html/assets/js">
    # Enable compression
    AddOutputFilterByType DEFLATE application/javascript

    # Cache control
    <FilesMatch "\.(js)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>

    # CORS
    Header set Access-Control-Allow-Origin "*"
</Directory>
```

### 4. Reference in HTML

```html
<script src="/assets/js/analytics-pulse.min.js"></script>
```

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Package

on:
  push:
    tags:
      - 'v*'  # Trigger on version tags (v0.1.0, v1.0.0, etc.)

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        working-directory: tracking-library
        run: npm ci

      - name: Run tests
        working-directory: tracking-library
        run: npm test

      - name: Build library
        working-directory: tracking-library
        run: npm run build

      - name: Measure bundle size
        working-directory: tracking-library
        run: npm run size

      - name: Publish to NPM
        working-directory: tracking-library
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
```

### NPM Token Setup

1. Generate NPM token:
   - Go to https://www.npmjs.com/settings/[username]/tokens
   - Click "Generate New Token"
   - Choose "Automation" type
   - Copy the token

2. Add to GitHub Secrets:
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: (paste your NPM token)

### Triggering a Release

```bash
# 1. Update version and create git tag
npm version patch  # Creates tag v0.1.1

# 2. Push tag to GitHub (triggers workflow)
git push origin --tags

# 3. GitHub Actions will:
#    - Run tests
#    - Build library
#    - Publish to NPM
#    - Create GitHub Release
```

## Release Checklist

Before releasing a new version, verify:

### Pre-Release

- [ ] All tests passing (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Bundle size acceptable (`npm run size` - target <5KB gzipped)
- [ ] CHANGELOG.md updated with changes
- [ ] Documentation updated (README, API docs)
- [ ] Browser compatibility tested
- [ ] No console errors in supported browsers
- [ ] Type definitions correct (`tsc --noEmit`)

### Version Update

- [ ] Update version in `package.json`
- [ ] Create git tag: `npm version [patch|minor|major]`
- [ ] Update version references in documentation

### Publishing

- [ ] Build fresh distribution: `npm run build`
- [ ] Dry run package: `npm pack --dry-run`
- [ ] Publish to NPM: `npm publish`
- [ ] Verify package on NPM: https://www.npmjs.com/package/@analytics-pulse/tracking-library
- [ ] Push git tags: `git push origin --tags`
- [ ] Create GitHub Release with changelog

### Post-Release

- [ ] Test installation: `npm install @analytics-pulse/tracking-library@latest`
- [ ] Verify CDN availability (wait ~5 min for jsDelivr/UNPKG)
- [ ] Test in sample application
- [ ] Announce release (blog, social media, etc.)
- [ ] Update dependent projects

## Troubleshooting

### Build Failures

**Issue**: TypeScript compilation errors
```bash
# Clear build cache
rm -rf dist/
npm run build
```

**Issue**: Rollup plugin errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### NPM Publishing Issues

**Issue**: 403 Forbidden
```bash
# Re-authenticate
npm login

# Verify login
npm whoami
```

**Issue**: Version already exists
```bash
# Bump version
npm version patch

# Or manually update package.json version
```

**Issue**: Package name conflict
- Change package name in `package.json`
- Use scoped package: `@your-org/tracking-library`

### CDN Issues

**Issue**: Old version served from CDN
- jsDelivr/UNPKG: Purge cache via their dashboard
- Custom CDN: Invalidate CloudFront distribution
- Wait up to 24 hours for global propagation

**Issue**: 404 on CDN
- Verify package published to NPM
- Wait 5-10 minutes for CDN sync
- Check URL format and version number

## Support and Resources

- **GitHub Repository**: https://github.com/Jeffrey-Keyser/Analytics-Pulse
- **Issue Tracker**: https://github.com/Jeffrey-Keyser/Analytics-Pulse/issues
- **NPM Package**: https://www.npmjs.com/package/@analytics-pulse/tracking-library
- **Documentation**: See `README.md` and `docs/` directory
- **Browser Compatibility**: See `BROWSER_COMPATIBILITY.md`

## License

This library is released under the MIT License. See `LICENSE` file for details.
