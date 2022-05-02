import * as vscode from 'vscode';

export function validTestFilename(
    uri: vscode.Uri
) {
    const workspace = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspace) { return false; }

    const relativePath = vscode.workspace.asRelativePath(uri.path, true);
    return !relativePath.includes('/.');
}
