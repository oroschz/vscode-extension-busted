import * as vscode from 'vscode';
import * as path from 'path';
import { tokenizePath } from './utils';

export function createTestNode(
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder,
    uri: vscode.Uri,
) {
    const { root, tokens } = tokenizePath(workspace, uri);
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

    collection.add(testItem);

    return testItem;
}

export function findTestNode(
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder,
    uri: vscode.Uri,
) {
    const { root, tokens } = tokenizePath(workspace, uri);
    return findTestNodeRecursion(ctrlTest, root, tokens);
}

function findTestNodeRecursion(
    ctrlTest: vscode.TestController,
    root: string,
    tokens: string[],
    parent?: vscode.TestItem,
): vscode.TestItem | undefined {

    const testId = path.join(parent?.uri?.path ?? root, tokens[0]);
    const collection = parent?.children ?? ctrlTest.items;
    const testItem = collection.get(testId);

    if (tokens.length <= 1) { return testItem; }
    return findTestNodeRecursion(ctrlTest, root, tokens.slice(1), testItem);
}

export function deleteTestNode(
    ctrlTest: vscode.TestController,
    test: vscode.TestItem
) {
    const collection = test.parent?.children ?? ctrlTest.items;

    collection.delete(test.id);
}