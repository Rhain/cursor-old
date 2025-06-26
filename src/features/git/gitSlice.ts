import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { FullState } from '../window/state'

export interface GitState {
    recentChanges: string[]
    isCommitInProgress: boolean
    lastCommitMessage: string | null
}

const initialGitState: GitState = {
    recentChanges: [],
    isCommitInProgress: false,
    lastCommitMessage: null,
}

export const generateCommitMessage = createAsyncThunk(
    'git/generateCommitMessage',
    async (args: null, { getState }) => {
        const state = getState() as FullState
        
        try {
            const gitStatus = await connector.getGitStatus()
            const gitDiff = await connector.getGitDiff()
            
            const commitMessage = await generateConventionalCommitMessage(gitStatus, gitDiff)
            
            return commitMessage
        } catch (error) {
            throw new Error(`Failed to generate commit message: ${error}`)
        }
    }
)

export const commitWithGeneratedMessage = createAsyncThunk(
    'git/commitWithGeneratedMessage',
    async (message: string, { dispatch }) => {
        try {
            await connector.gitCommit(message)
            return message
        } catch (error) {
            throw new Error(`Commit failed: ${error}`)
        }
    }
)

async function generateConventionalCommitMessage(status: string, diff: string): Promise<string> {
    const changes = parseGitChanges(status, diff)
    
    const type = determineCommitType(changes)
    const scope = determineCommitScope(changes)
    const description = generateCommitDescription(changes, type)
    
    let commitMessage = `${type}`
    if (scope) {
        commitMessage += `(${scope})`
    }
    commitMessage += `: ${description}`
    
    if (changes.hasBreakingChanges) {
        commitMessage = commitMessage.replace(':', '!:')
    }
    
    return commitMessage
}

interface GitChanges {
    added: string[]
    modified: string[]
    deleted: string[]
    renamed: string[]
    hasBreakingChanges: boolean
    affectedFiles: string[]
}

function parseGitChanges(status: string, diff: string): GitChanges {
    const changes: GitChanges = {
        added: [],
        modified: [],
        deleted: [],
        renamed: [],
        hasBreakingChanges: false,
        affectedFiles: []
    }
    
    const statusLines = status.split('\n').filter(line => line.trim())
    
    for (const line of statusLines) {
        const statusCode = line.substring(0, 2)
        const filePath = line.substring(3)
        
        changes.affectedFiles.push(filePath)
        
        if (statusCode.includes('A')) changes.added.push(filePath)
        if (statusCode.includes('M')) changes.modified.push(filePath)
        if (statusCode.includes('D')) changes.deleted.push(filePath)
        if (statusCode.includes('R')) changes.renamed.push(filePath)
    }
    
    changes.hasBreakingChanges = detectBreakingChanges(diff)
    
    return changes
}

function determineCommitType(changes: GitChanges): string {
    if (changes.added.length > 0 && changes.modified.length === 0 && changes.deleted.length === 0) {
        if (changes.added.some(file => file.includes('test') || file.includes('spec'))) {
            return 'test'
        }
        if (changes.added.some(file => file.includes('doc') || file.includes('README'))) {
            return 'docs'
        }
        return 'feat'
    }
    
    if (changes.deleted.length > 0 && changes.added.length === 0 && changes.modified.length === 0) {
        return 'refactor'
    }
    
    if (changes.modified.length > 0) {
        const modifiedPaths = changes.modified.join(' ')
        if (modifiedPaths.includes('test') || modifiedPaths.includes('spec')) {
            return 'test'
        }
        if (modifiedPaths.includes('doc') || modifiedPaths.includes('README')) {
            return 'docs'
        }
        if (modifiedPaths.includes('package.json') || modifiedPaths.includes('yarn.lock') || modifiedPaths.includes('package-lock.json')) {
            return 'chore'
        }
        return 'fix'
    }
    
    if (changes.renamed.length > 0) {
        return 'refactor'
    }
    
    return 'chore'
}

function determineCommitScope(changes: GitChanges): string | null {
    const allFiles = [...changes.added, ...changes.modified, ...changes.deleted, ...changes.renamed]
    
    const directories = allFiles
        .map(file => file.split('/')[0])
        .filter(dir => dir !== '.' && dir !== '..' && !dir.includes('.'))
    
    const uniqueDirectories = [...new Set(directories)]
    
    if (uniqueDirectories.length === 1) {
        return uniqueDirectories[0]
    }
    
    if (uniqueDirectories.includes('src')) {
        return 'core'
    }
    
    return null
}

function generateCommitDescription(changes: GitChanges, type: string): string {
    const { added, modified, deleted, renamed } = changes
    
    if (type === 'feat') {
        if (added.length === 1) {
            const fileName = added[0].split('/').pop()?.replace(/\.[^/.]+$/, '')
            return `add ${fileName} functionality`
        }
        return `add new features`
    }
    
    if (type === 'fix') {
        if (modified.length === 1) {
            const fileName = modified[0].split('/').pop()?.replace(/\.[^/.]+$/, '')
            return `resolve issues in ${fileName}`
        }
        return `resolve multiple issues`
    }
    
    if (type === 'refactor') {
        if (renamed.length > 0) {
            return `restructure and rename files`
        }
        if (deleted.length > 0) {
            return `remove unused code and files`
        }
        return `improve code structure`
    }
    
    if (type === 'docs') {
        return `update documentation`
    }
    
    if (type === 'test') {
        return `update test coverage`
    }
    
    if (type === 'chore') {
        if (changes.affectedFiles.some(f => f.includes('package.json'))) {
            return `update dependencies`
        }
        return `update build configuration`
    }
    
    return `update project files`
}

function detectBreakingChanges(diff: string): boolean {
    const breakingPatterns = [
        /BREAKING CHANGE:/i,
        /BREAKING:/i,
        /^-.*export.*function/m,
        /^-.*export.*class/m,
        /^-.*export.*interface/m,
        /^-.*export.*type/m,
        /^-.*public.*function/m,
        /^-.*public.*method/m,
    ]
    
    return breakingPatterns.some(pattern => pattern.test(diff))
}

const gitSlice = createSlice({
    name: 'git',
    initialState: initialGitState,
    reducers: {
        setRecentChanges: (state, action: PayloadAction<string[]>) => {
            state.recentChanges = action.payload
        },
        clearLastCommitMessage: (state) => {
            state.lastCommitMessage = null
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(generateCommitMessage.pending, (state) => {
                state.isCommitInProgress = true
            })
            .addCase(generateCommitMessage.fulfilled, (state, action) => {
                state.isCommitInProgress = false
                state.lastCommitMessage = action.payload
            })
            .addCase(generateCommitMessage.rejected, (state) => {
                state.isCommitInProgress = false
            })
            .addCase(commitWithGeneratedMessage.fulfilled, (state, action) => {
                state.lastCommitMessage = action.payload
                state.recentChanges = []
            })
    }
})

export const { setRecentChanges, clearLastCommitMessage } = gitSlice.actions
export default gitSlice.reducer