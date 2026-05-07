# Publishing Guide

Instructions for publishing VueScanr to npm.

## Prerequisites

1. Node.js 16+
2. pnpm 10.23.0+
3. npm account at https://www.npmjs.com
4. Git repository configured

## Pre-Publication Checklist

- [ ] All tests passing
- [ ] Code reviewed and tested
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG updated
- [ ] Build outputs generated
- [ ] README.md and USAGE.md are up to date
- [ ] LICENSE file present
- [ ] Git changes committed

## Build Library

```bash
# Install dependencies
pnpm install

# Build library
pnpm run build-lib

# Verify build output
ls -la lib-dist/
```

The build generates:
- `lib-dist/index.js` - CommonJS build
- `lib-dist/index.es.js` - ESM build
- `lib-dist/*.d.ts` - TypeScript declarations

## Authenticate with npm

```bash
# Login to npm
npm login

# Verify login
npm whoami
```

## Publish to npm

### Initial Publication (0.1.0)

```bash
# Make sure you're on main branch
git checkout main

# Build library
pnpm run build-lib

# Publish
npm publish

# Verify on npm
npm view vuescanr
```

### Subsequent Publications

#### Patch Release (Bug fixes: 0.1.x)
```bash
npm version patch
npm publish
```

#### Minor Release (Features: 0.x.0)
```bash
npm version minor
npm publish
```

#### Major Release (Breaking: x.0.0)
```bash
npm version major
npm publish
```

## Verify Publication

After publishing, verify:

```bash
# Check on npm registry
npm view vuescanr

# Check package contents
npm view vuescanr files

# Install from npm
npm install vuescanr

# Test installation
node -e "require('vuescanr')"
```

## Versions Released

| Version | Date | Notes |
|---------|------|-------|
| 0.1.0 | 2024 | Initial release |

## Troubleshooting

### 401 Unauthorized
- Run `npm login` again
- Check npm credentials: `npm profile get`

### 403 Forbidden
- Ensure package name is unique
- Check you have permission for the name
- Try unpublishing: `npm unpublish vuescanr@<version>`

### Version Already Exists
- Increment version number
- Check: `npm view vuescanr versions`

### Large Package
- Ensure `.npmignore` is properly configured
- Check package size: `npm pack`

## Package Contents

The npm package includes:
- `lib-dist/` - Compiled library files
- `README.md` - Main documentation
- `USAGE.md` - API usage guide
- `LICENSE` - MIT license
- `package.json` - Package metadata

## Tips

1. **Semantic Versioning** - Use MAJOR.MINOR.PATCH
2. **TypeScript** - Always include `.d.ts` files
3. **Documentation** - Keep README and USAGE updated
4. **Build Script** - Always build before publishing
5. **Dry Run** - Use `npm publish --dry-run` to test

## Post-Publication

After publishing:

1. Tag the release in Git
```bash
git tag v0.1.0
git push origin v0.1.0
```

2. Create GitHub release with notes

3. Announce in community channels

4. Update `pkgVersion` references if applicable

## Maintenance

Regular maintenance tasks:

```bash
# Check for security vulnerabilities
npm audit

# Update dependencies
npm update

# Check installed packages
npm list

# Check outdated packages
npm outdated
```

## License

Publishing confirms agreement to MIT license and npm Terms of Service.
