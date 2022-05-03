import * as vscode from 'vscode';

export function isValidTestFile(
    uri: vscode.Uri
) {
    const isHidden = uri.path.includes('/.');
    const hasSpecSuffix = uri.path.endsWith('_spec.lua');

    return !isHidden && hasSpecSuffix;
}
