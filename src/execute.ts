import * as vscode from 'vscode';
import { getChildCase } from './util';
import { TestController, TestRun, TestRunRequest, CancellationToken, TestItem, TestMessage } from 'vscode';
import { spawn } from 'child_process';

const updateCaseResults = (results: TestRunResult, run: TestRun, group: TestItem) => {

    for (const result of results.successes) {
        const testCase = getChildCase(group, result.name);
        if (!testCase) { continue; }

        const duration = 1000 * result.element.duration;
        run.passed(testCase, duration);
    }

    for (const result of results.failures) {
        const testCase = getChildCase(group, result.name);
        if (!testCase) { continue; }

        const message = new TestMessage(result.trace.traceback);
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

        const message = new TestMessage(result.trace.traceback);
        const duration = 1000 * result.element.duration;
        run.errored(testCase, message, duration);
    }
};

const updateNodeResults = (results: TestRunResult, run: TestRun, group: TestItem) => {
    const duration = 1000 * results.duration;
    if (results.failures.length) {
        run.failed(group, new TestMessage(""), duration);
    } else if (results.errors.length) {
        run.errored(group, new TestMessage(""), duration);
    } else if (results.pendings.length) {
        run.skipped(group);
    } else {
        run.passed(group, duration);
    }
};

const getTestQueue = (include: TestItem[], run: TestRun): TestItem[] => {
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

const runTestNode = (test: TestItem, run: TestRun, token: CancellationToken) => {
    return new Promise<void>(resolve => {

        const cwd = vscode.workspace.getWorkspaceFolder(test.uri!);
        const options = { cwd: cwd!.uri.path };
        const child = spawn('busted', ['-o', 'json', test.uri!.path], options);

        token.onCancellationRequested(child.kill);

        let output = "";
        child.stdout.on('data', data => { output += data; });

        child.stderr.on('data', data => { console.error(data); });

        child.on('error', error => {
            vscode.window.showErrorMessage(error.message);
        });

        child.on('close', _code => {
            if (child.killed) { return; }
            try {
                const results = JSON.parse(output) as TestRunResult;
                updateCaseResults(results, run, test);
                updateNodeResults(results, run, test);
            } catch {
                const message = new TestMessage("Error parsing json input.");
                run.errored(test, message);
                vscode.window.showErrorMessage(`${test.id}: ${message.message}`);
            }
            resolve();
        });

        run.started(test);
    });
};

export const executor = async (ctrl: TestController, request: TestRunRequest, token: CancellationToken) => {

    const run = ctrl.createTestRun(request);
    const include: TestItem[] = [];

    if (request.include) {
        request.include.forEach((test) => include.push(test));
    } else {
        ctrl.items.forEach((test) => include.push(test));
    }

    const queue = getTestQueue(include, run);

    const runTestFile = async (test: TestItem) => {

        if (request.exclude?.includes(test)) { return; }
        if (token.isCancellationRequested) { return; }
        if (!test.uri) { return; }

        return runTestNode(test, run, token);
    };

    // Run tests files sequencially
    // for (const test of queue) { await runTestFile(test); }

    // Run tests files concurrently
    await Promise.allSettled(queue.map(runTestFile));

    run.end();
};