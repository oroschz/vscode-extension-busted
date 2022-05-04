import * as vscode from 'vscode';
import { createTestResolver } from "./resolve";
import { createTestRunner } from './execute';

export function activate(context: vscode.ExtensionContext) {

    const ctrlTest = vscode.tests.createTestController('busted-tests', 'Busted Tests');
    context.subscriptions.push(ctrlTest);

    ctrlTest.resolveHandler = createTestResolver(context, ctrlTest);

    const testRunner = (
        request: vscode.TestRunRequest,
        token: vscode.CancellationToken) => createTestRunner(ctrlTest, request, token);

    context.subscriptions.push(
        ctrlTest.createRunProfile('Run', vscode.TestRunProfileKind.Run, testRunner),
        ctrlTest.createRunProfile('Debug', vscode.TestRunProfileKind.Debug, testRunner)
    );
}

export function deactivate() { }
