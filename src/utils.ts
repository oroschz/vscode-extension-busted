import * as vscode from 'vscode';
import * as path from 'path';

export function isValidTestFile(
    context: vscode.ExtensionContext,
    uri: vscode.Uri
) {
    const suffix = context.globalState.get('suffix', '_spec.lua');
    const isHidden = uri.path.includes('/.');
    const hasSpecSuffix = uri.path.endsWith(suffix);

    return !isHidden && hasSpecSuffix;
}

/** Generates the id of a test case given its uri and label */
export function getTestCaseId(uri: vscode.Uri, label: string) {
    return uri.path.trim() + ":" + label.trim();
};

export const getChildCase = (group: vscode.TestItem, label: string) => {
    const caseId = getTestCaseId(group.uri!, label);
    return group.children.get(caseId) ?? (group.id === caseId ? group : undefined);
};

export function tokenizePath(
    workspace: vscode.WorkspaceFolder,
    uri: vscode.Uri
) {
    const root = path.dirname(workspace.uri.path);
    const relativePath = path.relative(root, uri.path);
    const tokens = relativePath.split(path.sep);

    return { root, tokens };
}
