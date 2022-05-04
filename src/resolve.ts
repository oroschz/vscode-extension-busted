import * as vscode from 'vscode';
import { createTestNode, findTestNode, deleteTestNode } from './tree';
import { parseTestFile } from './populate';
import { isValidTestFile } from './utils';

const GLOB_PATTERN = 'spec/**';

export function createTestResolver(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController
) {
    const workspaces = vscode.workspace.workspaceFolders ?? [];
    watchAllWorkspaces(context, ctrlTest, workspaces);

    return async function (test?: vscode.TestItem) {
        if (!test) {
            return resolveAllWorkspaces(ctrlTest, workspaces);
        }
        const workspace = vscode.workspace.getWorkspaceFolder(test.uri!);
        return parseTestFile(ctrlTest, test, workspace);
    };
}

async function watchAllWorkspaces(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController,
    workspaces: readonly vscode.WorkspaceFolder[]
) {
    const watchers = await Promise.all(
        workspaces.map(
            workspace => watchWorkspace(ctrlTest, workspace)
        )
    );
    watchers.forEach(
        watcher => context.subscriptions.push(watcher)
    );
}

async function watchWorkspace(
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder
) {
    const pattern = new vscode.RelativePattern(workspace, 'spec/**');
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidCreate(uri => appendTestFile(ctrlTest, workspace, uri));

    watcher.onDidDelete(uri => removeTestFile(ctrlTest, uri));

    watcher.onDidChange(uri => updateTestFile(ctrlTest, workspace, uri));

    return watcher;
}

async function resolveAllWorkspaces(
    ctrlTest: vscode.TestController,
    workspaces: readonly vscode.WorkspaceFolder[]
) {
    workspaces.forEach(
        workspace => resolveWorkspace(ctrlTest, workspace)
    );
}

async function resolveWorkspace(
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder
) {
    const pattern = new vscode.RelativePattern(workspace, GLOB_PATTERN);
    const files = await vscode.workspace.findFiles(pattern);

    return Promise.allSettled(
        files.map(file => appendTestFile(ctrlTest, workspace, file))
    );
}

async function appendTestFile(
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder,
    uri: vscode.Uri
) {
    const exists = findTestNode(uri);
    if (exists) { return; }

    if (!isValidTestFile(uri)) { return; }

    const test = createTestNode(ctrlTest, workspace, uri);
    if (!test) { return; }

    parseTestFile(ctrlTest, test, workspace);
}

async function removeTestFile(
    ctrlTest: vscode.TestController,
    uri: vscode.Uri
) {
    const test = findTestNode(uri);
    if (!test) { return; }

    deleteTestNode(ctrlTest, test);
    vscode.window.showErrorMessage(test.label);
}

async function updateTestFile(
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder,
    uri: vscode.Uri
) {
    const test = findTestNode(uri);
    if (!test) { return; }

    test.children.forEach(
        item => test.children.delete(item.id)
    );
    parseTestFile(ctrlTest, test, workspace);
}
