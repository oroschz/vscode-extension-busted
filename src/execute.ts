import * as vscode from 'vscode';
import { getChildCase } from './utils';
import { createBustedProcess } from './process';

type TestStatus = 'success' | 'failure' | 'pending' | 'error';

type TestResults = {
    name: string,
    message: string,
    element: {
        duration: number,
    }
    trace: {
        traceback: string
    }
};

type SuiteResults = {
    successes: TestResults[],
    failures: TestResults[],
    pendings: TestResults[],
    errors: TestResults[],
    duration: number
};

function updateTestResults(
    result: TestResults,
    status: TestStatus,
    run: vscode.TestRun,
    suite: vscode.TestItem
) {
    const test = getChildCase(suite, result.name);
    if (!test) { return; }

    const duration = 1000 * result.element.duration;
    const message = new vscode.TestMessage(result.message);

    switch (status) {
        case 'success':
            run.passed(test, duration);
            break;
        case 'pending':
            run.skipped(test);
            break;
        case 'failure':
            run.failed(test, message, duration);
            break;
        case 'error':
            run.errored(test, message, duration);
            break;
    }
}

function updateAllResults(
    results: SuiteResults,
    run: vscode.TestRun,
    suite: vscode.TestItem
) {
    for (const result of results.successes) {
        updateTestResults(result, 'success', run, suite);
    }

    for (const result of results.failures) {
        updateTestResults(result, 'failure', run, suite);
    }

    for (const result of results.pendings) {
        updateTestResults(result, 'pending', run, suite);
    }

    for (const result of results.errors) {
        updateTestResults(result, 'error', run, suite);
    }
}

function updateSuiteResults(
    results: SuiteResults,
    run: vscode.TestRun,
    suite: vscode.TestItem
) {
    const duration = 1000 * results.duration;
    const message = new vscode.TestMessage("");

    if (results.errors.length > 0) {
        return run.errored(suite, message, duration);
    }
    if (results.failures.length > 0) {
        return run.failed(suite, message, duration);
    }
    if (results.pendings.length > 0) {
        return run.skipped(suite);
    }
    if (results.successes.length > 0) {
        return run.passed(suite, duration);
    }
    run.skipped(suite);
};

function runTestSuite(
    context: vscode.ExtensionContext,
    workspace: vscode.WorkspaceFolder,
    run: vscode.TestRun,
    token: vscode.CancellationToken,
    suite: vscode.TestItem,
) {
    return new Promise<void>((resolve) => {

        const child = createBustedProcess('json', workspace, suite.uri!);

        token.onCancellationRequested(() => child.kill());

        let output = "";
        child.stdout.on('data', (data) => { output += data; });

        child.on('close', (code) => {
            if (child.killed) { return resolve(); }
            try {
                const results = JSON.parse(output) as SuiteResults;
                updateAllResults(results, run, suite);
                updateSuiteResults(results, run, suite);
            } catch {
                const message = "Error parsing json input.";
                run.errored(suite, new vscode.TestMessage(message));
            }
            resolve();
        });

        run.started(suite);
    });
}

function createQueueRecurse(
    run: vscode.TestRun,
    queue: vscode.TestItem[],
    item: vscode.TestItem
) {
    if (item.uri?.path.endsWith('.lua')) {
        run.enqueued(item);
        queue.push(item);
        return;
    }
    item.children.forEach(
        child => createQueueRecurse(run, queue, child)
    );
}

function createQueue(
    ctrlTest: vscode.TestController,
    run: vscode.TestRun,
    request: vscode.TestRunRequest,
) {
    const exclude = request.exclude ?? [];
    const candidates = request.include ?? ctrlTest.items;
    const queue = [] as vscode.TestItem[];

    candidates.forEach(item => createQueueRecurse(run, queue, item));
    return queue.filter(item => !exclude.includes(item));
}

async function testRunner(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController,
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken
) {
    const run = ctrlTest.createTestRun(request);
    const queue = createQueue(ctrlTest, run, request);

    const runTestFile = (suite: vscode.TestItem) => {
        const workspace = vscode.workspace.getWorkspaceFolder(suite.uri!);
        return runTestSuite(context, workspace!, run, token, suite);
    };

    // Run suites sequentially
    for (const test of queue) { await runTestFile(test); }

    // Run suites concurrently
    // await Promise.allSettled(queue.map(runTestFile));

    run.end();
}

export function createTestRunner(
    context: vscode.ExtensionContext,
    ctrlTest: vscode.TestController
) {
    return (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {
        return testRunner(context, ctrlTest, request, token);
    };
}