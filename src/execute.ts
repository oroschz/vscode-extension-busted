import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { getChildCase } from './utils';


type TestCaseResult = {
    name: string,
    element: {
        duration: number,
    }
    trace: {
        traceback: string
    }
};

type TestRunResult = {
    successes: TestCaseResult[],
    failures: TestCaseResult[],
    pendings: TestCaseResult[],
    errors: TestCaseResult[],
    duration: number
};

function updateCaseResults(
    results: TestRunResult,
    run: vscode.TestRun,
    group: vscode.TestItem
) {
    for (const result of results.successes) {
        const testCase = getChildCase(group, result.name);
        if (!testCase) { continue; }

        const duration = 1000 * result.element.duration;
        run.passed(testCase, duration);
    }

    for (const result of results.failures) {
        const testCase = getChildCase(group, result.name);
        if (!testCase) { continue; }

        const message = new vscode.TestMessage(result.trace.traceback);
        const duration = 1000 * result.element.duration;
        run.failed(testCase, message, duration);
    }

    for (const result of results.pendings) {
        const testCase = getChildCase(group, result.name);
        if (!testCase) { continue; }

        run.skipped(testCase);
    }

    for (const result of results.errors) {
        const testCase = getChildCase(group, result.name);
        if (!testCase) { continue; }

        const message = new vscode.TestMessage(result.trace.traceback);
        const duration = 1000 * result.element.duration;
        run.errored(testCase, message, duration);
    }
};

function updateNodeResults(
    results: TestRunResult,
    run: vscode.TestRun,
    group: vscode.TestItem
) {
    const duration = 1000 * results.duration;
    if (results.failures.length) {
        run.failed(group, new vscode.TestMessage(""), duration);
    } else if (results.errors.length) {
        run.errored(group, new vscode.TestMessage(""), duration);
    } else if (results.pendings.length) {
        run.skipped(group);
    } else if (results.successes.length) {
        run.passed(group, duration);
    }
};

function getTestQueue(
    include: vscode.TestItem[],
    run: vscode.TestRun
): vscode.TestItem[] {

    const queue = [];
    for (const item of include) {
        run.enqueued(item);
        if (item.uri?.path.includes('.lua')) {
            queue.push(item);
            item.children.forEach(child => run.enqueued(child));
            continue;
        }
        item.children.forEach(child => include.push(child));
    }
    return queue;
};

function runTestNode(
    test: vscode.TestItem,
    run: vscode.TestRun,
    token: vscode.CancellationToken,
    workspace?: vscode.WorkspaceFolder
) {
    return new Promise<void>((resolve) => {

        const args = ['-o', 'json', test.uri!.path];
        const options = workspace ? { cwd: workspace.uri.path } : {};
        const child = spawn('busted', args, options);

        token.onCancellationRequested(() => child.kill());

        let output = "";
        child.stdout.on('data', (data) => { output += data; });

        child.on('close', (code) => {
            if (child.killed) { return resolve(); }
            try {
                const results = JSON.parse(output) as TestRunResult;
                updateCaseResults(results, run, test);
                updateNodeResults(results, run, test);
            } catch {
                const message = "Error parsing json input.";
                run.errored(test, new vscode.TestMessage(message));
            }
            resolve();
        });

        run.started(test);
    });
};

async function testRunner(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController,
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken
) {
    const run = ctrlTest.createTestRun(request);
    const include: vscode.TestItem[] = [];

    if (request.include) {
        request.include.forEach((test) => include.push(test));
    } else {
        ctrlTest.items.forEach((test) => include.push(test));
    }

    const queue = getTestQueue(include, run);

    const runTestFile = async (test: vscode.TestItem) => {

        if (request.exclude?.includes(test)) { return; }
        if (token.isCancellationRequested) { return; }
        if (!test.uri) { return; }

        const workspace = vscode.workspace.getWorkspaceFolder(test.uri!);
        return runTestNode(test, run, token, workspace);
    };

    // Run tests files sequencially
    // for (const test of queue) { await runTestFile(test); }

    // Run tests files concurrently
    await Promise.allSettled(queue.map(runTestFile));

    run.end();
}

export function createTestRunner(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController
) {
    return (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {
        return testRunner(context, ctrlTest, request, token);
    };
};