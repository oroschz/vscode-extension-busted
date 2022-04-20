import * as path from 'path';
import * as vscode from 'vscode';
import { getTestCaseId } from './util';
import { TestController, Uri, WorkspaceFolder, TestItem, ExtensionContext } from 'vscode';
import { spawn } from 'child_process';


export const getTestNode = (testCtrl: TestController, uri: Uri, create: boolean = true) => {

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
            testNode = testCtrl.createTestItem(nodeId, token, Uri.file(nodeId));
            nodeGroup.add(testNode);
        }
        nodeGroup = testNode.children;
    }
    return testNode;
};

export const dropTestNode = (ctrl: TestController, uri: Uri) => {
    const testNode = getTestNode(ctrl, uri, false);
    if (!testNode) { return; }
    if (!testNode.parent) {
        ctrl.items.delete(uri.path);
        return;
    }
    testNode.parent.children.delete(uri.path);
};

const watchWorkspace = async (ctrl: TestController, workspace: WorkspaceFolder) => {

    const pattern = new vscode.RelativePattern(workspace, '**/*_spec.lua');
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidCreate(uri => parseTestNode(ctrl, getTestNode(ctrl, uri)));

    watcher.onDidDelete(uri => dropTestNode(ctrl, uri));

    watcher.onDidChange(uri => parseTestNode(ctrl, getTestNode(ctrl, uri)));

    for (const file of await vscode.workspace.findFiles(pattern)) {
        parseTestNode(ctrl, getTestNode(ctrl, file));
    }

    return watcher;
};

const watchAllWorkspaces = async (ctrl: TestController) => {

    const workspaces = vscode.workspace.workspaceFolders;
    if (!workspaces) { return []; }

    return Promise.all(workspaces.map(ws => watchWorkspace(ctrl, ws)));
};


// Whether to resolve all workspaces, or just a particular node.
export const resolver = (context: ExtensionContext, ctrl: TestController) => {
    return async (test: TestItem | undefined) => {
        if (!test) {
            const watchers = await watchAllWorkspaces(ctrl);
            watchers.forEach(watcher => context.subscriptions.push(watcher));
        } else {
            await parseTestNode(ctrl, test);
        }
    };
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
export const getTestCase = (ctrl: TestController, text: string, test: TestItem) => {

    const [row, label] = parseMatch(text);
    const testId = getTestCaseId(test.uri!, label);

    const existing = test.children.get(testId);
    if (existing) { return; }

    const testCase = ctrl.createTestItem(testId, label, test.uri);
    test.children.add(testCase);

    const position = new vscode.Position(row - 1, 0);
    testCase.range = new vscode.Range(position, position);

    return testCase;
};

// Executes 'busted --list <spec file>' to discover test cases.
export const parseTestNode = async (ctrl: TestController, test: TestItem | undefined) => {

    if (!test?.uri) { return; }

    const workspace = vscode.workspace.getWorkspaceFolder(test.uri);
    if (!workspace) { return; }

    const options = { 'cwd': workspace.uri.path };
    const child = spawn('busted', ['--list', test.uri.path], options);

    child.stdout.on('data', data => {
        const text = String.fromCharCode(...data).trim();
        text.split('\n').forEach(line => getTestCase(ctrl, line, test));
    });
};