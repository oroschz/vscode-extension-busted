import * as vscode from 'vscode';
import * as path from 'path';

export function isValidTestFile(
    uri: vscode.Uri
) {
    const isHidden = uri.path.includes('/.');
    const hasSpecSuffix = uri.path.endsWith('_spec.lua');

    return !isHidden && hasSpecSuffix;
}

/** Generates the id of a test case given its uri and label */
export function getTestCaseId(uri: vscode.Uri, label: string) {
    return uri.path.trim() + ":" + label.trim();
};

export const getChildCase = (group: vscode.TestItem, label: string) => {
    const caseId = getTestCaseId(group.uri!, label);
    return group.children.get(caseId);
};

export function tokenizePath(
    workspace: vscode.WorkspaceFolder,
    uri: vscode.Uri
) {
    const root = path.dirname(workspace.uri.path);
    const relativePath = path.relative(root, uri.path);
    const tokens = relativePath.split("/");

    return { root, tokens };
}
