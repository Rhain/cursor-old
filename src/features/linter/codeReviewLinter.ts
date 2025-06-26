import { syntaxTree } from '@codemirror/language'
import { Diagnostic, linter, replace } from './lint'
import { EditorView } from '@codemirror/view'
import { diffField } from '../extensions/diff'

// Security analysis rules
const SECURITY_PATTERNS = [
    {
        name: 'SQL Injection Risk',
        pattern: /\$\{[^}]*\}.*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/gi,
        severity: 'error' as const,
        message: 'Potential SQL injection vulnerability. Use parameterized queries instead.',
        fix: 'Use prepared statements or parameterized queries'
    },
    {
        name: 'XSS Risk',
        pattern: /innerHTML\s*=\s*.*\$\{[^}]*\}/gi,
        severity: 'error' as const,
        message: 'Potential XSS vulnerability. Avoid using innerHTML with user input.',
        fix: 'Use textContent or properly sanitize the content'
    },
    {
        name: 'Hardcoded Secrets',
        pattern: /(?:password|secret|key|token|api_key)\s*[:=]\s*["'][^"']+["']/gi,
        severity: 'error' as const,
        message: 'Hardcoded secret detected. Use environment variables or secure configuration.',
        fix: 'Move secrets to environment variables'
    },
    {
        name: 'Eval Usage',
        pattern: /\beval\s*\(/gi,
        severity: 'error' as const,
        message: 'Use of eval() is dangerous and should be avoided.',
        fix: 'Replace eval() with safer alternatives'
    },
    {
        name: 'Weak Crypto',
        pattern: /\b(?:md5|sha1)\b/gi,
        severity: 'warning' as const,
        message: 'Weak cryptographic algorithm detected. Use stronger alternatives.',
        fix: 'Use SHA-256 or stronger algorithms'
    }
]

// Code style analysis rules
const STYLE_PATTERNS = [
    {
        name: 'Console.log Usage',
        pattern: /console\.log\(/gi,
        severity: 'warning' as const,
        message: 'Console.log statements should be removed in production code.',
        fix: 'Use proper logging library or remove debug statements'
    },
    {
        name: 'TODO Comments',
        pattern: /\/\/\s*TODO\b/gi,
        severity: 'info' as const,
        message: 'TODO comment found. Consider creating a task or fixing the issue.',
        fix: 'Address the TODO or create a proper task'
    },
    {
        name: 'Magic Numbers',
        pattern: /(?<![a-zA-Z_$])\b(?!0|1|2|10|100|1000)\d{3,}\b/g,
        severity: 'info' as const,
        message: 'Magic number detected. Consider using a named constant.',
        fix: 'Replace with a named constant'
    },
    {
        name: 'Function Length',
        pattern: /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{500,}?\}/g,
        severity: 'warning' as const,
        message: 'Function is very long. Consider breaking it into smaller functions.',
        fix: 'Split into smaller, more focused functions'
    }
]

// TypeScript/JavaScript specific patterns
const TYPESCRIPT_PATTERNS = [
    {
        name: 'Any Type Usage',
        pattern: /:\s*any\b/gi,
        severity: 'warning' as const,
        message: 'Usage of "any" type defeats TypeScript benefits. Use specific types.',
        fix: 'Define proper types instead of using any'
    },
    {
        name: 'Non-null Assertion',
        pattern: /!\s*;/g,
        severity: 'warning' as const,
        message: 'Non-null assertion operator should be used carefully.',
        fix: 'Add proper null checks or ensure the value cannot be null'
    },
    {
        name: 'Unused Imports',
        pattern: /^import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];\s*$/gm,
        severity: 'info' as const,
        message: 'Potentially unused import. Remove if not needed.',
        fix: 'Remove unused imports'
    }
]

interface CodeReviewRule {
    name: string
    pattern: RegExp
    severity: 'error' | 'warning' | 'info'
    message: string
    fix: string
}

function analyzeText(text: string, rules: CodeReviewRule[], source: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = []
    
    for (const rule of rules) {
        const matches = Array.from(text.matchAll(rule.pattern))
        
        for (const match of matches) {
            if (match.index !== undefined) {
                const lines = text.substring(0, match.index).split('\n')
                const line = lines.length
                const col = lines[lines.length - 1].length
                
                diagnostics.push({
                    from: match.index,
                    to: match.index + match[0].length,
                    line,
                    col,
                    severity: rule.severity,
                    message: `${rule.name}: ${rule.message}`,
                    source: source,
                    actions: [
                        {
                            name: 'Fix',
                            payload: [replace('')] // For now, just suggest removal
                        }
                    ]
                })
            }
        }
    }
    
    return diagnostics
}

function getChangedLines(view: EditorView): Set<number> {
    const diff = view.state.field(diffField, false)
    const changedLines = new Set<number>()
    
    if (!diff || !diff.visibleDeco) {
        // If no diff info, analyze all lines (fallback behavior)
        return new Set()
    }
    
    // Iterate through diff decorations to find changed lines
    const diffIter = diff.visibleDeco.iter()
    while (diffIter.value) {
        if (diffIter.value.spec.type === 'added' || diffIter.value.spec.type === 'removed') {
            const lineNumber = view.state.doc.lineAt(diffIter.from).number
            changedLines.add(lineNumber)
        }
        diffIter.next()
    }
    
    return changedLines
}

function shouldAnalyzeLine(lineNumber: number, changedLines: Set<number>): boolean {
    // If we have diff information, only analyze changed lines
    if (changedLines.size > 0) {
        return changedLines.has(lineNumber)
    }
    // If no diff information, analyze all lines
    return true
}

export const codeReviewLinter = linter((view: EditorView) => {
    const diagnostics: Diagnostic[] = []
    const text = view.state.doc.toString()
    const changedLines = getChangedLines(view)
    
    // Get file extension to determine language
    const fileName = (view as any).fileName || ''
    const isTypeScript = fileName.endsWith('.ts') || fileName.endsWith('.tsx')
    const isJavaScript = fileName.endsWith('.js') || fileName.endsWith('.jsx') || isTypeScript
    
    let allRules: CodeReviewRule[] = [...SECURITY_PATTERNS, ...STYLE_PATTERNS]
    
    if (isJavaScript || isTypeScript) {
        allRules = [...allRules, ...TYPESCRIPT_PATTERNS]
    }
    
    // Analyze the entire text but filter based on changed lines
    const allDiagnostics = [
        ...analyzeText(text, SECURITY_PATTERNS, 'Security Review'),
        ...analyzeText(text, STYLE_PATTERNS, 'Style Review')
    ]
    
    if (isJavaScript || isTypeScript) {
        allDiagnostics.push(...analyzeText(text, TYPESCRIPT_PATTERNS, 'TypeScript Review'))
    }
    
    // Filter diagnostics to only include those on changed lines
    for (const diagnostic of allDiagnostics) {
        const lineNumber = view.state.doc.lineAt(diagnostic.from).number
        if (shouldAnalyzeLine(lineNumber, changedLines)) {
            // Mark as code review diagnostic
            diagnostic.severity = 'aiwarning'
            diagnostics.push(diagnostic)
        }
    }
    
    return diagnostics
})

// Function to manually trigger code review on demand
export function triggerCodeReview(view: EditorView): void {
    // Force the linter to run by dispatching an empty effect
    // This will trigger the linter to re-run its analysis
    view.dispatch({
        effects: []
    })
}