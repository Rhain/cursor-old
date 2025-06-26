import { generateCommitMessage, commitWithGeneratedMessage } from '../gitSlice'

// Mock the connector
const mockConnector = {
    getGitStatus: jest.fn(),
    getGitDiff: jest.fn(),
    gitCommit: jest.fn(),
}

// @ts-ignore
global.connector = mockConnector

describe('gitSlice', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('generateCommitMessage', () => {
        it('should generate conventional commit message for new feature', async () => {
            mockConnector.getGitStatus.mockResolvedValue('A  src/components/newFeature.tsx\n')
            mockConnector.getGitDiff.mockResolvedValue('+ function newFeature() {\n+   return <div>New Feature</div>\n+ }\n')

            const dispatch = jest.fn()
            const getState = jest.fn().mockReturnValue({})

            const thunk = generateCommitMessage(null)
            const result = await thunk(dispatch, getState, undefined)

            expect(result).toBe('feat(components): add newFeature functionality')
        })

        it('should generate conventional commit message for bug fix', async () => {
            mockConnector.getGitStatus.mockResolvedValue('M  src/utils/helper.ts\n')
            mockConnector.getGitDiff.mockResolvedValue('- const buggyCode = true\n+ const fixedCode = false\n')

            const dispatch = jest.fn()
            const getState = jest.fn().mockReturnValue({})

            const thunk = generateCommitMessage(null)
            const result = await thunk(dispatch, getState, undefined)

            expect(result).toBe('fix(utils): resolve issues in helper')
        })

        it('should generate conventional commit message for documentation', async () => {
            mockConnector.getGitStatus.mockResolvedValue('M  README.md\n')
            mockConnector.getGitDiff.mockResolvedValue('+ ## New Documentation Section\n')

            const dispatch = jest.fn()
            const getState = jest.fn().mockReturnValue({})

            const thunk = generateCommitMessage(null)
            const result = await thunk(dispatch, getState, undefined)

            expect(result).toBe('docs: update documentation')
        })

        it('should generate conventional commit message for test files', async () => {
            mockConnector.getGitStatus.mockResolvedValue('A  src/components/__tests__/newTest.test.tsx\n')
            mockConnector.getGitDiff.mockResolvedValue('+ describe("test suite", () => {\n+   it("should work", () => {})\n+ })\n')

            const dispatch = jest.fn()
            const getState = jest.fn().mockReturnValue({})

            const thunk = generateCommitMessage(null)
            const result = await thunk(dispatch, getState, undefined)

            expect(result).toBe('test(components): add newTest functionality')
        })

        it('should detect breaking changes', async () => {
            mockConnector.getGitStatus.mockResolvedValue('M  src/api/client.ts\n')
            mockConnector.getGitDiff.mockResolvedValue('- export function oldAPI() {}\n+ export function newAPI() {}\n')

            const dispatch = jest.fn()
            const getState = jest.fn().mockReturnValue({})

            const thunk = generateCommitMessage(null)
            const result = await thunk(dispatch, getState, undefined)

            expect(result).toBe('fix(api)!: resolve issues in client')
        })

        it('should handle multiple files with common scope', async () => {
            mockConnector.getGitStatus.mockResolvedValue('M  src/components/Button.tsx\nM  src/components/Input.tsx\n')
            mockConnector.getGitDiff.mockResolvedValue('various changes')

            const dispatch = jest.fn()
            const getState = jest.fn().mockReturnValue({})

            const thunk = generateCommitMessage(null)
            const result = await thunk(dispatch, getState, undefined)

            expect(result).toBe('fix(components): resolve multiple issues')
        })

        it('should handle dependency updates', async () => {
            mockConnector.getGitStatus.mockResolvedValue('M  package.json\n')
            mockConnector.getGitDiff.mockResolvedValue('- "react": "17.0.0"\n+ "react": "18.0.0"\n')

            const dispatch = jest.fn()
            const getState = jest.fn().mockReturnValue({})

            const thunk = generateCommitMessage(null)
            const result = await thunk(dispatch, getState, undefined)

            expect(result).toBe('chore: update dependencies')
        })
    })

    describe('commitWithGeneratedMessage', () => {
        it('should commit with the provided message', async () => {
            const message = 'feat: add new feature'
            mockConnector.gitCommit.mockResolvedValue(undefined)

            const dispatch = jest.fn()
            const getState = jest.fn().mockReturnValue({})

            const thunk = commitWithGeneratedMessage(message)
            const result = await thunk(dispatch, getState, undefined)

            expect(mockConnector.gitCommit).toHaveBeenCalledWith(message)
            expect(result).toBe(message)
        })

        it('should handle commit errors', async () => {
            const message = 'feat: add new feature'
            const error = new Error('Commit failed')
            mockConnector.gitCommit.mockRejectedValue(error)

            const dispatch = jest.fn()
            const getState = jest.fn().mockReturnValue({})

            const thunk = commitWithGeneratedMessage(message)

            await expect(thunk(dispatch, getState, undefined)).rejects.toThrow('Commit failed: Error: Commit failed')
        })
    })
})