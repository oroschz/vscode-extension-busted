import * as vscode from 'vscode';
import { createTestResolver } from "./resolve";
import { createTestRunner } from './execute';

export async function activate(context: vscode.ExtensionContext) {
    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("busted-tests")) {
            context.subscriptions.forEach(item => item.dispose());
        }
        configure(context);
    });

    await configure(context);
}

async function configure(context: vscode.ExtensionContext) {

    const config = vscode.workspace.getConfiguration('busted-tests');
    await context.globalState.update('prefix', config.get('pattern.prefix'));
    await context.globalState.update('suffix', config.get('pattern.suffix'));
    await context.globalState.update('program', config.get('execution.program'));
    await context.globalState.update('execution', config.get('execution.mode'));

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
