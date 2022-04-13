import *  as path from 'path';
import * as vscode from 'vscode';
import { spawn } from 'child_process';

export function activate(context: vscode.ExtensionContext) {

    const testCtrl = vscode.tests.createTestController('busted-tests', 'Busted Tests');
    context.subscriptions.push(testCtrl);

    const getTestNode = (uri: vscode.Uri, create: boolean = true) => {

        const workspace = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspace) { return; }

        const relativePath = vscode.workspace.asRelativePath(uri.path, true);

        // Exclude hidden tests.
        if (relativePath.includes("/.")) { return; }

        // Create a branch of testItems if necessary.
        let testNode: vscode.TestItem | undefined;
        let nodeGroup = testCtrl.items;
        let nodeId = path.dirname(workspace.uri.path);
        const tokens = relativePath.split("/");
        for (const token of tokens) {
            nodeId = path.join(nodeId, token);
            testNode = nodeGroup.get(nodeId);
            if (!testNode) {
                if (!create) { return; }
                const nodeUri = vscode.Uri.file(nodeId);
                testNode = testCtrl.createTestItem(nodeId, token, nodeUri);
                nodeGroup.add(testNode);
            }
            nodeGroup = testNode.children;
        }
        return testNode;
    };

    const dropTestNode = (uri: vscode.Uri) => {
        const testNode = getTestNode(uri, false);
        if (!testNode) { return; }
        if (!testNode.parent) {
            testCtrl.items.delete(uri.path);
            return;
        }
        testNode.parent.children.delete(uri.path);
    };

    const watchWorkspace = async (workspace: vscode.WorkspaceFolder) => {

        const pattern = new vscode.RelativePattern(workspace, '**/*_spec.lua');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate(uri => parseTestNode(getTestNode(uri)));

        watcher.onDidDelete(uri => dropTestNode(uri));

        watcher.onDidChange(uri => parseTestNode(getTestNode(uri)));

        for (const file of await vscode.workspace.findFiles(pattern)) {
            parseTestNode(getTestNode(file));
        }

        context.subscriptions.push(watcher);

        return watcher;
    };

    const watchAllWorkspaces = async () => {

        const workspaces = vscode.workspace.workspaceFolders;
        if (!workspaces) { return []; }

        return Promise.all(workspaces.map(watchWorkspace));
    };


    // Whether to resolve all workspaces, or just a particular node.
    testCtrl.resolveHandler = async (test) => {
        if (!test) {
            await watchAllWorkspaces();
        } else {
            await parseTestNode(test);
        }
    };

    // Parses an output line to retrive their aproximate row and label.
    const parseMatch = (text: string): [number, string] => {

        const pattern = /([^\/]+(\/[^\/:]+)+_spec.lua):(\d+): (.+)/;
        const match = pattern.exec(text);

        if (!match) { return [1, text]; }

        const row = parseInt(match[3]);
        const name = match[4].trim();

        return [row, name];
    };

    const getTestCaseId = (uri: vscode.Uri, name: string) => {
        return uri.path.trim() + ":" + name.trim();
    };

    // Generate test cases given an output line from the list command.
    const getTestCase = (text: string, test: vscode.TestItem) => {

        const [row, label] = parseMatch(text);
        const testId = getTestCaseId(test.uri!, label);

        const existing = test.children.get(testId);
        if (existing) { return; }

        const testCase = testCtrl.createTestItem(testId, label, test.uri);
        test.children.add(testCase);

        const position = new vscode.Position(row - 1, 0);
        testCase.range = new vscode.Range(position, position);

        return testCase;
    };

    // Executes 'busted --list <spec file>' to discover test cases.
    const parseTestNode = async (test: vscode.TestItem | undefined) => {

        if (!test?.uri) { return; }

        const workspace = vscode.workspace.getWorkspaceFolder(test.uri);
        if (!workspace) { return; }

        const options = { 'cwd': workspace.uri.path };
        const child = spawn('busted', ['--list', test.uri.path], options);

        child.stdout.on('data', data => {
            const text = String.fromCharCode(...data).trim();
            text.split('\n').forEach(line => getTestCase(line, test));
        });
    };

    const parseTestsInDocument = (doc: vscode.TextDocument) => {
        if (doc.uri.scheme !== 'file') { return; }
        if (!doc.uri.path.endsWith('_spec.lua')) { return; }
        parseTestNode(getTestNode(doc.uri));
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
            event => event.files.forEach(dropTestNode)
        )
    );

    // Updates the tests run results based on busted json response.
    const updateRunResults = (results: any, run: vscode.TestRun, group: vscode.TestItem) => {

        const { successes, failures, pendings, errors } = results;

        const states = [successes, failures, pendings, errors];

        for (const state of states) {
            for (const result of state) {

                const caseId = getTestCaseId(group.uri!, result.name);
                const testCase = group.children.get(caseId);

                if (!testCase) { continue; }

                const duration = 1000 * result.element.duration;
                const message = new vscode.TestMessage(result.trace.traceback);
                switch (state) {
                    case successes:
                        run.passed(testCase, duration);
                        break;
                    case failures:
                        run.failed(testCase, message, duration);
                        break;
                    case pendings:
                        run.skipped(testCase);
                        break;
                    case errors:
                        run.errored(testCase, message, duration);
                        break;
                }
            }
        }

        const duration = 1000 * results.duration;
        if (failures.length > 0) {
            const message = new vscode.TestMessage("");
            run.failed(group, message, duration);
        } else if (errors.length > 0) {
            const message = new vscode.TestMessage("");
            run.errored(group, message, duration);
        } else if (pendings.length > 0) {
            run.skipped(group);
        } else {
            run.passed(group, duration);
        }
    };

    const runHandler = async (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {

        const run = testCtrl.createTestRun(request);
        const _queue: vscode.TestItem[] = [];

        if (request.include) {
            request.include.forEach((test) => _queue.push(test));
        } else {
            testCtrl.items.forEach((test) => _queue.push(test));
        }

        // TODO: Implement a better alternative to this algorithm.
        const queue = [];
        for (const item of _queue) {
            run.enqueued(item);
            if (item.uri?.path.includes('.lua')) {
                queue.push(item);
                item.children.forEach(child => run.enqueued(child));
                continue;
            }
            item.children.forEach(child => _queue.push(child));
        }

        const runTestFile = async (test: vscode.TestItem) => {

            // TODO: Review the need for these check guards.
            if (request.exclude?.includes(test) || token.isCancellationRequested) {
                return;
            }

            if (!test.uri) {
                console.log("Uri not found for test");
                return;
            }

            // TODO: This promise could be handled better.
            return new Promise<void>((resolve, reject) => {

                const cwd = vscode.workspace.getWorkspaceFolder(test.uri!);
                const options = { cwd: cwd!.uri.path };
                const child = spawn('busted', ['-o', 'json', test.uri!.path], options);

                token.onCancellationRequested(child.kill);

                // TODO: There may probably be other alternatives to buffering stdout.
                let output = "";
                child.stdout.on('data', data => { output += data; });

                child.stderr.on('data', data => { console.error(data); });

                child.on('error', error => {
                    vscode.window.showErrorMessage(error.message);
                });

                child.on('close', code => {
                    if (child.killed) {
                        return;
                    }
                    try {
                        const results = JSON.parse(output);
                        updateRunResults(results, run, test);
                    } catch {
                        const message = new vscode.TestMessage("Error parsing json input.");
                        run.errored(test, message);
                        vscode.window.showErrorMessage(`${test.id}: ${message.message}`);
                    }
                    resolve();
                });

                run.started(test);
            });
        };

        // Run tests files sequencially
        // for (const test of queue) { await runTestFile(test); }

        // Run tests files concurrently
        await Promise.allSettled(queue.map(runTestFile));

        run.end();
    };

    context.subscriptions.push(
        testCtrl.createRunProfile('Run', vscode.TestRunProfileKind.Run, runHandler),
        testCtrl.createRunProfile('Debug', vscode.TestRunProfileKind.Debug, runHandler)
    );
}

export function deactivate() { }
