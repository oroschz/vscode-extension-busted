import * as vscode from 'vscode';
import { createBustedProcess } from './process';
import { createInterface } from 'readline';
import { getTestCaseId } from './utils';

/** Parses an output line to retrive their aproximate row and label. */
function parseStdOut(line: string) {

    const pattern = /([^\/]+(\/[^\/:]+)+_spec.lua):(\d+): (.+)/;
    const match = pattern.exec(line);

    if (!match) { return { row: 1, label: line }; }

    const row = parseInt(match[3]);
    const label = match[4].trim();

    return { row, label };
};

/** Generate test cases given an output line from the 'busted --list' command. */
function getTestCase(
    ctrlTest: vscode.TestController,
    test: vscode.TestItem,
    line: string
) {

    const { row, label } = parseStdOut(line);
    const testId = getTestCaseId(test.uri!, label);

    const existing = test.children.get(testId);
    if (existing) { return; }

    const testCase = ctrlTest.createTestItem(testId, label, test.uri);
    test.children.add(testCase);

    const position = new vscode.Position(row - 1, 0);
    testCase.range = new vscode.Range(position, position);

    return testCase;
}

/** Executes 'busted --list' to discover test cases. */
export async function parseTestFile(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController,
    workspace: vscode.WorkspaceFolder,
    test: vscode.TestItem,
) {
    const child = createBustedProcess(context, workspace, 'list', test.uri!);

    test.canResolveChildren = false;

    const scanner = createInterface({ input: child.stdout });
    scanner.on('line', (line) => getTestCase(ctrlTest, test, line));
};