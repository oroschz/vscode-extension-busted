import * as vscode from 'vscode';
import { resolver, parseTestNode, getTestNode, dropTestNode } from './resolve';
import { executor } from './execute';

export function activate(context: vscode.ExtensionContext) {

    const controller = vscode.tests.createTestController('busted-tests', 'Busted Tests');
    context.subscriptions.push(controller);

    controller.resolveHandler = resolver(context, controller);

    const parseTestsInDocument = (textDoc: vscode.TextDocument) => {
        if (textDoc.uri.scheme !== 'file') { return; }
        if (!textDoc.uri.path.endsWith('_spec.lua')) { return; }
        parseTestNode(controller, getTestNode(controller, textDoc.uri));
    };

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(parseTestsInDocument),
        vscode.workspace.onDidChangeTextDocument(
            event => parseTestsInDocument(event.document)
        )
    );

    // Covers the case of test modules deletion from within VSCode.
    context.subscriptions.push(
        vscode.workspace.onDidDeleteFiles(
            event => event.files.forEach(file => dropTestNode(controller, file))
        )
    );

    const runHandler = (
        request: vscode.TestRunRequest,
        token: vscode.CancellationToken) => executor(controller, request, token);

    context.subscriptions.push(
        controller.createRunProfile('Run', vscode.TestRunProfileKind.Run, runHandler),
        controller.createRunProfile('Debug', vscode.TestRunProfileKind.Debug, runHandler)
    );
}

export function deactivate() { }
