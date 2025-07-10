import { exec } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";

const execAsync = promisify(exec);

class GitService {
  private workspaceRoot: string;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || this.getWorkspaceRoot();
  }

  private getWorkspaceRoot(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error("No workspace folder found");
    }
    return workspaceFolders[0].uri.fsPath;
  }

  private async execGitCommand(command: string): Promise<string> {
    try {
      console.log(`Executing git command in directory: ${this.workspaceRoot}`);
      console.log(`Command: ${command}`);
      const { stdout } = await execAsync(command, { cwd: this.workspaceRoot });
      return stdout;
    } catch (error) {
      throw new Error(`Git command failed: ${error}`);
    }
  }
  /**
   * Get staged changes (diff between index and HEAD)
   */
  async getStagedDiff(): Promise<string> {
    try {
      return await this.execGitCommand("git diff --cached");
    } catch (error) {
      throw new Error(`Failed to get staged diff: ${error}`);
    }
  }

  /**
   * Get unstaged changes (diff between working directory and index)
   */
  async getUnstagedDiff(): Promise<string> {
    try {
      return await this.execGitCommand("git diff");
    } catch (error) {
      throw new Error(`Failed to get unstaged diff: ${error}`);
    }
  }

  /**
   * Get all changes (staged + unstaged)
   */
  async getAllDiff(): Promise<string> {
    try {
      return await this.execGitCommand("git diff HEAD");
    } catch (error) {
      throw new Error(`Failed to get all diff: ${error}`);
    }
  }

  /**
   * Get diff between two commits
   */
  async getDiffBetweenCommits(
    fromCommit: string,
    toCommit: string
  ): Promise<string> {
    try {
      return await this.execGitCommand(`git diff ${fromCommit}..${toCommit}`);
    } catch (error) {
      throw new Error(`Failed to get diff between commits: ${error}`);
    }
  }

  /**
   * Get diff for the last N commits
   */
  async getLastCommitsDiff(numberOfCommits: number = 1): Promise<string> {
    try {
      return await this.execGitCommand(`git diff HEAD~${numberOfCommits}`);
    } catch (error) {
      throw new Error(`Failed to get last commits diff: ${error}`);
    }
  }

  /**
   * Get diff with file names only
   */
  async getDiffNameOnly(): Promise<string[]> {
    try {
      const stdout = await this.execGitCommand("git diff --name-only");
      return stdout
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);
    } catch (error) {
      throw new Error(`Failed to get diff name only: ${error}`);
    }
  }

  /**
   * Get diff with statistics
   */
  async getDiffStats(): Promise<string> {
    try {
      return await this.execGitCommand("git diff --stat");
    } catch (error) {
      throw new Error(`Failed to get diff stats: ${error}`);
    }
  }

  /**
   * Default method - gets staged changes if available, otherwise unstaged
   */
  async getDiff(): Promise<string> {
    try {
      const stagedDiff = await this.getStagedDiff();
      if (stagedDiff.trim()) {
        return stagedDiff;
      }
      return await this.getUnstagedDiff();
    } catch (error) {
      throw new Error(`Failed to get diff: ${error}`);
    }
  }

  /**
   * Check if there are any changes
   */
  async hasChanges(): Promise<boolean> {
    try {
      const diff = await this.getDiff();
      return diff.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all commit messages from today
   */
  async getTodaysCommitMessages(): Promise<string[]> {
    try {
      const stdout = await this.execGitCommand(
        'git log --since="midnight" --pretty=format:"%s"'
      );
      return stdout
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);
    } catch (error) {
      throw new Error(`Failed to get today's commit messages: ${error}`);
    }
  }

  /**
   * Get detailed commit information from today
   */
  async getTodaysCommitsDetailed(): Promise<string> {
    try {
      return await this.execGitCommand(
        'git log --since="midnight" --pretty=format:"%h - %s (%an, %ar)"'
      );
    } catch (error) {
      throw new Error(`Failed to get today's detailed commits: ${error}`);
    }
  }

  /**
   * Get commit messages from a specific date
   */
  async getCommitMessagesByDate(date: string): Promise<string[]> {
    try {
      const stdout = await this.execGitCommand(
        `git log --since="${date}" --until="${date} 23:59:59" --pretty=format:"%s"`
      );
      return stdout
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);
    } catch (error) {
      throw new Error(
        `Failed to get commit messages for date ${date}: ${error}`
      );
    }
  }
}

export default GitService;
