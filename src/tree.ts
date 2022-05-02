import * as vscode from 'vscode';
import * as path from 'path';

const testMap = new Map<string, vscode.TestItem>();

export function createTestNode(
    ctrlTest: vscode.TestController,
    uri: vscode.Uri,
) {
    const workspace = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspace) { return; }

    const relativePath = vscode.workspace.asRelativePath(uri.path, true);

    if (relativePath.includes("/.")) { return; }

    const tokens = relativePath.split("/");
    const root = path.dirname(workspace.uri.path);
    return createTestBranch(ctrlTest, root, tokens);
}

export function createTestBranch(
    ctrlTest: vscode.TestController,
    root: string,
    tokens: string[],
    parent?: vscode.TestItem,
): vscode.TestItem {

    const testId = path.join(parent?.uri?.path ?? root, tokens[0]);
    const testItem = getOrCreateTest(ctrlTest, testId, tokens[0], parent);

    if (tokens.length <= 1) { return testItem; }
    return createTestBranch(ctrlTest, root, tokens.slice(1), testItem);
}

function getOrCreateTest(
    ctrlTest: vscode.TestController,
    id: string,
    name: string,
    parent?: vscode.TestItem
) {
    const collection = parent?.children ?? ctrlTest.items;

    const existing = collection.get(id);
    if (existing) { return existing; }

    const testUri = vscode.Uri.file(id);
    const testItem = ctrlTest.createTestItem(id, name, testUri);

    testMap.set(id, testItem);
    collection.add(testItem);

    return testItem;
}

export function findTestNode(uri: vscode.Uri) {

    return testMap.get(uri.path);
}

export function deleteTestNode(
    ctrlTest: vscode.TestController,
    test: vscode.TestItem
) {
    const testId = test.uri!.path;
    if (!test.parent) { return ctrlTest.items.delete(testId); }

    test.parent.children.delete(testId);
    testMapCleanup(test);
}

function testMapCleanup(
    test: vscode.TestItem
) {
    testMap.delete(test.id);
    if (!test.canResolveChildren) { return; }
    test.children.forEach(child => testMapCleanup(child));
}
