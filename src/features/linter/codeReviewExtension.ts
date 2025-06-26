import { Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { codeReviewLinter, triggerCodeReview } from './codeReviewLinter'
import { lintGutter } from './lint'

// Configuration for code review
interface CodeReviewConfig {
    enabled: boolean
    autoTrigger: boolean
    onlyAnalyzeChangedCode: boolean
}

const defaultConfig: CodeReviewConfig = {
    enabled: true,
    autoTrigger: true,
    onlyAnalyzeChangedCode: true
}

// Key bindings for code review functionality
const codeReviewKeymap = keymap.of([
    {
        key: 'Ctrl-Shift-r', // Windows/Linux
        mac: 'Cmd-Shift-r',  // macOS
        run: (view: EditorView) => {
            triggerCodeReview(view)
            return true
        }
    }
])

// Main code review extension
export function createCodeReviewExtension(config: Partial<CodeReviewConfig> = {}): Extension {
    const finalConfig = { ...defaultConfig, ...config }
    
    if (!finalConfig.enabled) {
        return []
    }
    
    return [
        // Add the code review linter
        codeReviewLinter,
        
        // Add gutter markers for code review diagnostics
        lintGutter({
            markerFilter: (diagnostics) => 
                diagnostics.filter(d => d.source?.includes('Review')),
            tooltipFilter: (diagnostics) => 
                diagnostics.filter(d => d.source?.includes('Review'))
        }),
        
        // Add keyboard shortcuts
        codeReviewKeymap,
        
        // Theme customization for code review diagnostics
        EditorView.theme({
            '.cm-lint-marker-aiwarning': {
                content: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="%23a0a" d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm1 13H7v-2h2v2zm0-3H7V5h2v5z"/></svg>')`
            },
            '.cm-diagnostic-aiwarning .cm-diagnosticText': {
                color: '#a0a'
            }
        })
    ]
}

// Export the default extension with standard configuration
export const codeReviewExtension = createCodeReviewExtension()

// Export individual components for custom usage
export { codeReviewLinter, triggerCodeReview }
export type { CodeReviewConfig }