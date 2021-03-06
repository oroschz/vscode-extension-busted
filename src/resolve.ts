import * as vscode from 'vscode';
import { createTestNode, findTestNode, deleteTestNode } from './tree';
import { parseTestFile } from './populate';
import { isValidTestFile } from './utils';

export function createTestResolver(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController
) {
    const specPrefix = context.globalState.get('prefix', 'spec/**');
    const workspaces = vscode.workspace.workspaceFolders ?? [];
    watchAllWorkspaces(context, ctrlTest, workspaces, specPrefix);

    return async (test?: vscode.TestItem) => {
        if (!test) {
            return resolveAllWorkspaces(context, ctrlTest, workspaces, specPrefix);
        }
        const workspace = vscode.workspace.getWorkspaceFolder(test.uri!);
        if (workspace) {
            return parseTestFile(context, ctrlTest, workspace, test);
        }
    };
}

async function watchAllWorkspaces(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController,
    workspaces: readonly vscode.WorkspaceFolder[],
    prefixPattern: string
) {
    const watchers = await Promise.all(
        workspaces.map(
            workspace => watchWorkspace(context, ctrlTest, workspace, prefixPattern)
        )
    );
    watchers.forEach(
        watcher => context.subscriptions.push(watcher)
    );
}

async function watchWorkspace(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder,
    prefixPattern: string
) {
    const pattern = new vscode.RelativePattern(workspace, prefixPattern);
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidCreate(uri => appendTestFile(context, ctrlTest, workspace, uri));

    watcher.onDidDelete(uri => removeTestFile(context, ctrlTest, workspace, uri));

    watcher.onDidChange(uri => updateTestFile(context, ctrlTest, workspace, uri));

    return watcher;
}

async function resolveAllWorkspaces(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController,
    workspaces: readonly vscode.WorkspaceFolder[],
    prefixPattern: string
) {
    workspaces.forEach(
        workspace => resolveWorkspace(context, ctrlTest, workspace, prefixPattern)
    );
}

async function resolveWorkspace(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder,
    prefixPattern: string
) {
    const pattern = new vscode.RelativePattern(workspace, prefixPattern);
    const files = await vscode.workspace.findFiles(pattern);

    return Promise.allSettled(
        files.map(file => appendTestFile(context, ctrlTest, workspace, file))
    );
}

async function appendTestFile(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder,
    uri: vscode.Uri
) {
    const exists = findTestNode(ctrlTest, workspace, uri);
    if (exists) { return; }

    if (!isValidTestFile(context, uri)) { return; }

    const test = createTestNode(ctrlTest, workspace, uri);
    if (!test) { return; }

    parseTestFile(context, ctrlTest, workspace, test);
}

async function removeTestFile(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder,
    uri: vscode.Uri
) {
    const test = findTestNode(ctrlTest, workspace, uri);
    if (!test) { return; }

    deleteTestNode(ctrlTest, test);
    vscode.window.showErrorMessage(test.label);
}

async function updateTestFile(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder,
    uri: vscode.Uri
) {
    const test = findTestNode(ctrlTest, workspace, uri);
    if (!test) { return; }

    test.children.replace([]);
    parseTestFile(context, ctrlTest, workspace, test);
}
