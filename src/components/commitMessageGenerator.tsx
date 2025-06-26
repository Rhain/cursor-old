import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { generateCommitMessage, commitWithGeneratedMessage } from '../features/git/gitSlice'
import { FullState } from '../features/window/state'

export const CommitMessageGenerator: React.FC = () => {
    const dispatch = useDispatch()
    const { lastCommitMessage, isCommitInProgress } = useSelector(
        (state: FullState) => state.git
    )
    const [customMessage, setCustomMessage] = useState('')
    const [useCustomMessage, setUseCustomMessage] = useState(false)

    const handleGenerateMessage = async () => {
        try {
            // @ts-ignore
            await dispatch(generateCommitMessage(null))
        } catch (error) {
            console.error('Failed to generate commit message:', error)
        }
    }

    const handleCommit = async () => {
        const messageToUse = useCustomMessage ? customMessage : lastCommitMessage
        if (!messageToUse) return

        try {
            // @ts-ignore
            await dispatch(commitWithGeneratedMessage(messageToUse))
            setCustomMessage('')
            setUseCustomMessage(false)
        } catch (error) {
            console.error('Commit failed:', error)
        }
    }

    const canCommit = useCustomMessage ? customMessage.trim() : lastCommitMessage

    return (
        <div className="commit-generator p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Generate Commit Message</h3>
            
            <div className="mb-4">
                <button
                    onClick={handleGenerateMessage}
                    disabled={isCommitInProgress}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                    {isCommitInProgress ? 'Generating...' : 'Generate Conventional Commit Message'}
                </button>
            </div>

            {lastCommitMessage && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Generated Message:</label>
                    <div className="p-3 bg-white border rounded font-mono text-sm">
                        {lastCommitMessage}
                    </div>
                </div>
            )}

            <div className="mb-4">
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={useCustomMessage}
                        onChange={(e) => setUseCustomMessage(e.target.checked)}
                        className="mr-2"
                    />
                    Use custom message
                </label>
            </div>

            {useCustomMessage && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Custom Message:</label>
                    <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Enter your commit message..."
                        className="w-full p-2 border rounded font-mono text-sm"
                        rows={3}
                    />
                </div>
            )}

            <div className="flex gap-2">
                <button
                    onClick={handleCommit}
                    disabled={!canCommit || isCommitInProgress}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                >
                    Commit Changes
                </button>
            </div>

            <div className="mt-4 text-xs text-gray-600">
                <p>This tool generates commit messages following the Conventional Commits specification:</p>
                <ul className="list-disc list-inside mt-1">
                    <li><code>feat:</code> new features</li>
                    <li><code>fix:</code> bug fixes</li>
                    <li><code>docs:</code> documentation changes</li>
                    <li><code>test:</code> test additions or modifications</li>
                    <li><code>refactor:</code> code refactoring</li>
                    <li><code>chore:</code> maintenance tasks</li>
                </ul>
            </div>
        </div>
    )
}