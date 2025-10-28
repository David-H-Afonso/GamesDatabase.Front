# Contributing to Games Database

Thank you for your interest in contributing to Games Database. This document provides guidelines and information for contributors.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/GamesDatabase.Front.git
   cd GamesDatabase.Front
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/David-H-Afonso/GamesDatabase.Front.git
   ```

## Development Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Run the linter:
   ```bash
   npm run lint
   ```

## Making Changes

1. **Create a new branch** for your feature or bugfix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines below

3. **Test your changes** thoroughly:

   - Ensure the application builds without errors
   - Test functionality in both development and production builds
   - Verify responsive design on different screen sizes

4. **Commit your changes** with clear, descriptive commit messages:
   ```bash
   git commit -m "Add feature: description of what you added"
   ```

## Code Style Guidelines

### TypeScript/React

- Use TypeScript for all new code
- Follow existing code formatting (the project uses ESLint)
- Use functional components and hooks
- Keep components small and focused
- Use meaningful variable and function names

### SCSS

- Follow the existing file structure for styles
- Use BEM naming convention for CSS classes
- Avoid inline styles when possible
- Keep styles modular and component-specific

### General

- Write clear, self-documenting code
- Add comments for complex logic
- Keep functions small and single-purpose
- Avoid code duplication

## Submitting Changes

1. **Push your changes** to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub:

   - Provide a clear title and description
   - Reference any related issues
   - Explain what the changes do and why they're necessary
   - Include screenshots for UI changes

3. **Wait for review**:
   - Address any feedback from maintainers
   - Make requested changes in new commits
   - Keep the PR updated with the main branch if needed

## Pull Request Guidelines

- **One feature per PR**: Keep pull requests focused on a single feature or bugfix
- **Update documentation**: Include updates to README.md or other docs if needed
- **Test thoroughly**: Ensure all existing functionality still works
- **Follow conventions**: Match the existing code style and patterns
- **Be responsive**: Reply to comments and reviews in a timely manner

## Reporting Bugs

When reporting bugs, please include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots or error messages if applicable
- Your environment (browser, OS, Node version)

## Suggesting Features

Feature suggestions are welcome. Please:

- Check existing issues to avoid duplicates
- Clearly describe the feature and its benefits
- Explain how it fits with the project's goals
- Consider whether it might be better as a plugin or external tool

## Code of Conduct

- Be respectful and professional
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Keep discussions on-topic

## Questions?

If you have questions about contributing, feel free to:

- Open an issue for discussion
- Ask in pull request comments
- Check existing documentation and issues first

Thank you for contributing to Games Database!
