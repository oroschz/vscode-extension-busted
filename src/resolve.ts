import * as vscode from 'vscode';
import { createTestNode, findTestNode, deleteTestNode } from './tree';
import { validTestFilename } from './utils';

const GLOB_PATTERN = 'spec/**/*_spec.lua';

export function createTestResolver(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController
) {
    const workspaces = vscode.workspace.workspaceFolders ?? [];
    resolveAllWorkspaces(ctrlTest, workspaces);
    watchAllWorkspaces(context, ctrlTest, workspaces);

    return function () {
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
    const pattern = new vscode.RelativePattern(workspace, GLOB_PATTERN);
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidCreate(uri => appendTestFile(ctrlTest, workspace, uri));

    watcher.onDidDelete(uri => removeTestFile(ctrlTest, uri));

    watcher.onDidChange(uri => updateTestFile(ctrlTest, uri));

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
    const found = await vscode.workspace.findFiles(pattern);
    const testFiles = found.filter(validTestFilename);

    for (const file of testFiles) {
        appendTestFile(ctrlTest, workspace, file);
    }
}

async function appendTestFile(
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder,
    uri: vscode.Uri
) {
    const exists = findTestNode(uri);
    if (exists) { return; }

    const test = createTestNode(ctrlTest, workspace, uri);
    if (!test) { return; }

    vscode.window.showInformationMessage(test.label);
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
    uri: vscode.Uri
) {
    const test = findTestNode(uri);
    if (!test) { return; }

    vscode.window.showWarningMessage(test.label);
}
