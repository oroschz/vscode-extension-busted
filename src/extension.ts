import * as vscode from 'vscode';
import { createTestResolver } from "./resolve";
import { createTestRunner } from './execute';

export function activate(context: vscode.ExtensionContext) {

    const ctrlTest = vscode.tests.createTestController('busted-tests', 'Busted Tests');
    context.subscriptions.push(ctrlTest);

    ctrlTest.resolveHandler = createTestResolver(context, ctrlTest);

    const runnerTest = createTestRunner(context, ctrlTest);
    
    context.subscriptions.push(
        ctrlTest.createRunProfile('Run', vscode.TestRunProfileKind.Run, runnerTest),
        ctrlTest.createRunProfile('Debug', vscode.TestRunProfileKind.Debug, runnerTest)
    );
}

export function deactivate() { }
