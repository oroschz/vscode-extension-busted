import *  as path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    const testCtrl = vscode.tests.createTestController('busted-tests', 'Busted Tests');
    context.subscriptions.push(testCtrl);

    const getTestNode = (uri: vscode.Uri) => {

        const workspace = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspace) { return; }

        const relativePath = vscode.workspace.asRelativePath(uri.path, true);

        // Exclude hidden tests.
        if (relativePath.includes("/.")) { return; }

        // Create a branch of testItems if necessary.
        let testNode;
        let nodeGroup = testCtrl.items;
        let nodeId = path.dirname(workspace.uri.path);
        const tokens = relativePath.split("/");
        for (const token of tokens) {
            nodeId = path.join(nodeId, token);
            testNode = nodeGroup.get(nodeId);
            if (!testNode) {
                const nodeUri = vscode.Uri.file(nodeId);
                testNode = testCtrl.createTestItem(nodeId, token, nodeUri);
                nodeGroup.add(testNode);
            }
            nodeGroup = testNode.children;
        }
        return testNode;
    };

    const watchWorkspace = async (workspace: vscode.WorkspaceFolder) => {

        const pattern = new vscode.RelativePattern(workspace, '**/*_spec.lua');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate(uri => getTestNode(uri));

        // TODO: Delete node when its file is deleted.
        // watcher.onDidDelete(uri => getTestNode(uri));

        // TODO: Parse tests inside the node file when it is changed.
        // watcher.onDidChange(uri => toDoFunction ( getTestNode(uri) ));

        for (const file of await vscode.workspace.findFiles(pattern)) {
            const testNode = getTestNode(file);
            if (testNode) {
                // TODO: Parse tests inside the node file.
            }
        }

        context.subscriptions.push(watcher);

        return watcher;
    };

    const watchAllWorkspaces = async () => {

        const workspaces = vscode.workspace.workspaceFolders;
        if (!workspaces) { return []; }

        return Promise.all(workspaces.map(watchWorkspace));
    };


    testCtrl.resolveHandler = async (test) => {
        if (!test) {
            await watchAllWorkspaces();
        } else {
            // TODO: Parse tests inside the node file.
        }
    };
}

export function deactivate() { }
