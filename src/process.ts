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
    context: vscode.ExtensionContext,
    workspace: vscode.WorkspaceFolder,
    mode: ExecutionMode,
    uri: vscode.Uri
) {
    const program = context.globalState.get('program', 'busted');
    const args = [uri.path, ...executionArguments(mode)];
    const options = { 'cwd': workspace.uri.path };

    return spawn(program, args, options);
}