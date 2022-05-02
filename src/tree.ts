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
    group?: vscode.TestItemCollection,
    index?: number
): vscode.TestItem {

    index = index ?? 0;
    group = group ?? ctrlTest.items;

    const scope = tokens.slice(0, index + 1);
    const testId = path.join(root, ...scope);
    let testItem = group.get(testId);
    if (!testItem) {
        const testName = tokens[index];
        const testUri = vscode.Uri.file(testId);
        testItem = ctrlTest.createTestItem(testId, testName, testUri);
        testMap.set(testId, testItem);
        group.add(testItem);
    }
    if (index === tokens.length - 1) { return testItem; }
    return createTestBranch(ctrlTest, root, tokens, testItem.children, index + 1);
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
