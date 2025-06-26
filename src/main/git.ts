import { spawn } from 'child_process'
import * as path from 'path'

export interface GitConnector {
    getGitStatus(): Promise<string>
    getGitDiff(): Promise<string>
    gitCommit(message: string): Promise<void>
}

class GitConnectorImpl implements GitConnector {
    private rootPath: string | null = null

    setRootPath(rootPath: string) {
        this.rootPath = rootPath
    }

    async getGitStatus(): Promise<string> {
        return this.execGitCommand(['status', '--porcelain'])
    }

    async getGitDiff(): Promise<string> {
        return this.execGitCommand(['diff', '--staged'])
    }

    async gitCommit(message: string): Promise<void> {
        await this.execGitCommand(['commit', '-m', message])
    }

    private execGitCommand(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.rootPath) {
                reject(new Error('Root path not set'))
                return
            }

            const git = spawn('git', args, {
                cwd: this.rootPath,
                stdio: ['pipe', 'pipe', 'pipe']
            })

            let stdout = ''
            let stderr = ''

            git.stdout.on('data', (data) => {
                stdout += data.toString()
            })

            git.stderr.on('data', (data) => {
                stderr += data.toString()
            })

            git.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout)
                } else {
                    reject(new Error(`Git command failed: ${stderr || stdout}`))
                }
            })

            git.on('error', (error) => {
                reject(error)
            })
        })
    }
}

export const gitConnector = new GitConnectorImpl()