import * as vscode from 'vscode';
import { createTestResolver } from "./resolve";
import { createTestRunner } from './execute';

export async function activate(context: vscode.ExtensionContext) {

    await context.globalState.update('prefix', 'spec/**');
    await context.globalState.update('suffix', '_spec.lua');
    await context.globalState.update('program', 'busted');
    await context.globalState.update('execution', 'concurrent');

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
