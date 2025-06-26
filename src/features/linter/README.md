# Code Review Feature

This directory contains the code review functionality for Cursor editor that automatically analyzes code changes and provides security and style suggestions.

## Files

- `codeReviewLinter.ts` - Core linter that analyzes code for security and style issues
- `codeReviewExtension.ts` - CodeMirror extension that integrates code review with the editor
- `README.md` - This documentation file

## Features

### Security Analysis
- **SQL Injection Detection**: Identifies potential SQL injection vulnerabilities in string interpolation
- **XSS Prevention**: Warns about unsafe innerHTML usage with user input
- **Secret Detection**: Finds hardcoded passwords, API keys, and other secrets
- **Dangerous Functions**: Detects usage of `eval()` and other unsafe functions
- **Weak Cryptography**: Identifies usage of weak hash algorithms like MD5 and SHA1

### Style Analysis
- **Debug Code**: Finds `console.log` statements that should be removed in production
- **TODO Comments**: Highlights TODO comments that need attention
- **Magic Numbers**: Identifies numeric literals that should be named constants
- **Function Length**: Warns about overly long functions that should be refactored

### TypeScript/JavaScript Specific
- **Type Safety**: Warns about usage of `any` type
- **Null Safety**: Identifies risky non-null assertion operators
- **Import Cleanup**: Detects potentially unused imports

## Usage

### Automatic Analysis
The code review feature automatically runs when:
- Code is edited and changes are detected
- Files are opened in the editor
- Diffs are present (focuses on changed lines only)

### Manual Trigger
- **Keyboard Shortcut**: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (macOS)
- **Programmatic**: Call `triggerCodeReview(view)` function

### Visual Indicators
- **Gutter Markers**: Purple warning icons appear in the editor gutter
- **Tooltips**: Hover over marked code to see detailed explanations
- **Quick Fixes**: Some issues include suggested fixes

## Configuration

The code review feature can be configured in `codeReviewExtension.ts`:

```typescript
const config = {
    enabled: true,              // Enable/disable the feature
    autoTrigger: true,          // Automatically analyze code changes
    onlyAnalyzeChangedCode: true // Only analyze changed lines (when diff available)
}
```

## Integration

The code review feature integrates with Cursor's existing infrastructure:
- **Linting System**: Uses the same diagnostic framework as other linters
- **Diff System**: Leverages existing diff detection to focus on changed code
- **UI**: Follows the same visual patterns as other editor features

## Extending

To add new analysis rules:

1. Add patterns to the appropriate array in `codeReviewLinter.ts`:
   - `SECURITY_PATTERNS` for security-related rules
   - `STYLE_PATTERNS` for style-related rules
   - `TYPESCRIPT_PATTERNS` for TypeScript-specific rules

2. Each rule should have this structure:
```typescript
{
    name: 'Rule Name',
    pattern: /regex-pattern/gi,
    severity: 'error' | 'warning' | 'info',
    message: 'Description of the issue',
    fix: 'Suggested fix description'
}
```

## Future Enhancements

Potential improvements for the code review system:
- Language-specific rule sets for Python, Go, etc.
- Integration with external linting tools (ESLint, TSLint, etc.)
- Custom rule configuration via settings
- Performance analysis (complexity, performance anti-patterns)
- Accessibility analysis for web code
- Git integration for smarter change detection