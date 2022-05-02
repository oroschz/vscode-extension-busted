import * as vscode from 'vscode';
import { createTestResolver } from "./resolve";

export function activate(context: vscode.ExtensionContext) {

    const ctrlTest = vscode.tests.createTestController('busted-tests', 'Busted Tests');
    context.subscriptions.push(ctrlTest);

    ctrlTest.resolveHandler = createTestResolver(context, ctrlTest);
}

export function deactivate() { }
