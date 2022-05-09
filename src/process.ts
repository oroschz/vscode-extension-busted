import * as vscode from 'vscode';
import { spawn } from 'child_process';

type ExecutionMode = 'list' | 'json';

function executionArguments(mode: ExecutionMode) {
    if (mode === 'json') {
        return ['--output', 'json'];
    }
    return ['--list'];
}

export function createBustedProcess(
    mode: ExecutionMode,
    workspace: vscode.WorkspaceFolder,
    uri: vscode.Uri,
) {
    const args = [uri.path, ...executionArguments(mode)];
    const options = { 'cwd': workspace.uri.path };
    const child = spawn('busted', args, options);
    return child;
}