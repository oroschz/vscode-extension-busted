import *  as path from 'path';
import * as vscode from 'vscode';
import { spawn } from 'child_process';

export function activate(context: vscode.ExtensionContext) {

    const testCtrl = vscode.tests.createTestController('busted-tests', 'Busted Tests');
    context.subscriptions.push(testCtrl);

    const getTestNode = (uri: vscode.Uri, create: boolean = true) => {

        const workspace = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspace) { return; }

        const relativePath = vscode.workspace.asRelativePath(uri.path, true);

        // Exclude hidden tests.
        if (relativePath.includes("/.")) { return; }

        // Create a branch of testItems if necessary.
        let testNode: vscode.TestItem | undefined;
        let nodeGroup = testCtrl.items;
        let nodeId = path.dirname(workspace.uri.path);
        const tokens = relativePath.split("/");
        for (const token of tokens) {
            nodeId = path.join(nodeId, token);
            testNode = nodeGroup.get(nodeId);
            if (!testNode) {
                if (!create) { return; }
                const nodeUri = vscode.Uri.file(nodeId);
                testNode = testCtrl.createTestItem(nodeId, token, nodeUri);
                nodeGroup.add(testNode);
            }
            nodeGroup = testNode.children;
        }
        return testNode;
    };

    const dropTestNode = (uri: vscode.Uri) => {
        const testNode = getTestNode(uri, false);
        if (!testNode) { return; }
        if (!testNode.parent) {
            testCtrl.items.delete(uri.path);
            return;
        }
        testNode.parent.children.delete(uri.path);
    };

    const watchWorkspace = async (workspace: vscode.WorkspaceFolder) => {

        const pattern = new vscode.RelativePattern(workspace, '**/*_spec.lua');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate(uri => parseTestNode(getTestNode(uri)));

        watcher.onDidDelete(uri => dropTestNode(uri));

        watcher.onDidChange(uri => parseTestNode(getTestNode(uri)));

        for (const file of await vscode.workspace.findFiles(pattern)) {
            parseTestNode(getTestNode(file));
        }

        context.subscriptions.push(watcher);

        return watcher;
    };

    const watchAllWorkspaces = async () => {

        const workspaces = vscode.workspace.workspaceFolders;
        if (!workspaces) { return []; }

        return Promise.all(workspaces.map(watchWorkspace));
    };


    // Whether to resolve all workspaces, or just a particular node.
    testCtrl.resolveHandler = async (test) => {
        if (!test) {
            await watchAllWorkspaces();
        } else {
            await parseTestNode(test);
        }
    };

    // Parses an output line to retrive their aproximate row and label.
    const parseMatch = (text: string): [number, string] => {

        const pattern = /([^\/]+(\/[^\/:]+)+_spec.lua):(\d+): (.+)/;
        const match = pattern.exec(text);

        if (!match) { return [1, text]; }

        const row = parseInt(match[3]);
        const name = match[4].trim();

        return [row, name];
    };

    // Generate test cases given an output line from the list command.
    const getTestCase = (text: string, test: vscode.TestItem) => {

        const [row, label] = parseMatch(text);
        const testId = test.uri!.path + ":" + label;

        const existing = test.children.get(testId);
        if (existing) { return; }

        const testCase = testCtrl.createTestItem(testId, label, test.uri);
        test.children.add(testCase);

        const position = new vscode.Position(row - 1, 0);
        testCase.range = new vscode.Range(position, position);

        return testCase;
    };

    // Executes 'busted --list <spec file>' to discover test cases.
    const parseTestNode = async (test: vscode.TestItem | undefined) => {

        if (!test?.uri) { return; }

        const workspace = vscode.workspace.getWorkspaceFolder(test.uri);
        if (!workspace) { return; }

        const options = { 'cwd': workspace.uri.path };
        const process = spawn('busted', ['--list', test.uri.path], options);

        process.stdout.on('data', data => {
            const text = String.fromCharCode(...data).trim();
            text.split('\n').forEach(line => getTestCase(line, test));
        });
    };

    const parseTestsInDocument = (doc: vscode.TextDocument) => {
        if (doc.uri.scheme !== 'file') { return; }
        if (!doc.uri.path.endsWith('_spec.lua')) { return; }
        parseTestNode(getTestNode(doc.uri));
    };

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(parseTestsInDocument),
        vscode.workspace.onDidChangeTextDocument(
            event => parseTestsInDocument(event.document)
        )
    );

    // Covers the case of test modules deletion from within VSCode.
    context.subscriptions.push(
        vscode.workspace.onDidDeleteFiles(
            event => event.files.forEach(dropTestNode)
        )
    );
}

export function deactivate() { }
