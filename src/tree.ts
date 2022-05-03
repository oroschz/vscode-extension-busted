import * as vscode from 'vscode';
import * as path from 'path';

export const testMap = new Map<string, vscode.TestItem>();

export function createTestNode(
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder,
    uri: vscode.Uri,
) {
    const root = path.dirname(workspace.uri.path);
    const relativePath = path.relative(root, uri.path);
    const tokens = relativePath.split("/");

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
    const collection = test.parent?.children ?? ctrlTest.items;

    collection.delete(test.id);
    removeFromTestMap(test);
}

function removeFromTestMap(
    test: vscode.TestItem
) {
    testMap.delete(test.id);
    test.children.forEach(child => removeFromTestMap(child));
}
