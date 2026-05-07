# Contributing to VueScanr

Thank you for your interest in contributing to VueScanr! We welcome contributions from the community.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Prerequisites
- Node.js 16+
- pnpm 10.23.0+
- Git

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/farshidb/vuescanr.git
cd vuescanr

# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build library
pnpm run build-lib

# Build everything
pnpm run build
```

## Development Workflow

1. **Create a Branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make Changes**
   - Write clean, readable code
   - Follow the existing code style
   - Add TypeScript types
   - Update documentation

3. **Test Your Changes**
```bash
# Run dev server to test in playground
pnpm run dev

# Build and verify
pnpm run build-lib
```

4. **Commit Changes**
```bash
git add .
git commit -m "feat: describe your changes"
```

Use conventional commits:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `style:` for formatting
- `refactor:` for code restructuring
- `perf:` for performance improvements
- `test:` for tests

5. **Push and Create Pull Request**
```bash
git push origin feature/your-feature-name
```

## Pull Request Guidelines

- Describe what changes you made and why
- Reference related issues with `Closes #123`
- Ensure all tests pass
- Update documentation if needed
- Keep commits clean and organized

## Code Style

### TypeScript
- Use strict mode
- Add proper types, avoid `any`
- Use meaningful variable names
- Add JSDoc comments for public APIs

### Vue 3
- Use Composition API with `<script setup>`
- Use reactive refs for state
- Clean up resources on unmount
- Use proper TypeScript types

### Documentation
- Use clear, concise language
- Include code examples
- Keep README.md updated
- Update USAGE.md for API changes

## Testing

### Manual Testing
- Test in the playground: `pnpm run dev`
- Test on mobile browsers
- Test different camera configurations
- Test error scenarios

### Verification
```bash
# Build library
pnpm run build-lib

# Verify outputs
ls -la lib-dist/

# Check TypeScript compilation
npx tsc --noEmit
```

## Reporting Issues

### Bug Reports
Include:
- Browser and OS version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Console errors
- Code example if possible

### Feature Requests
Include:
- Use case description
- Expected behavior
- Current workaround (if any)
- Priority level

## Documentation

When submitting code:

1. **Update README.md** if adding features
2. **Update USAGE.md** if changing API
3. **Update CHANGELOG.md** with your changes
4. **Add JSDoc comments** for new functions
5. **Include TypeScript types** in declarations

## Project Structure

```
vuescanr/
├── src/                    # Source code
│   ├── composiable/       # Vue composables
│   │   └── zbar.ts        # Main useZbar composable
│   ├── core/              # Core logic
│   └── types/             # Type definitions
├── playground/            # Demo application
├── lib-dist/              # Build outputs
├── README.md              # Main documentation
├── USAGE.md               # API documentation
├── CHANGELOG.md           # Version history
└── package.json           # Package configuration
```

## Best Practices

### Performance
- Minimize re-renders
- Use efficient algorithms
- Cache when appropriate
- Profile before optimizing

### Accessibility
- Use semantic HTML
- Support keyboard navigation
- Provide alt text
- Test with assistive tools

### Security
- Don't expose sensitive data
- Validate user input
- Use security headers
- Keep dependencies updated

## Questions?

- Open an issue for questions
- Check existing issues and PRs
- Read USAGE.md for API questions
- Check playground for examples

## Feedback

We appreciate all feedback! Please:
- Be specific and constructive
- Provide examples when possible
- Help improve documentation
- Share your use cases

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- CHANGELOG.md
- GitHub contributors page
- Release notes

Thank you for contributing to VueScanr! 🎉
