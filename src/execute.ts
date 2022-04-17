import * as vscode from 'vscode';
import { getTestCaseId } from './util';
import { TestController, TestRun, TestRunRequest, CancellationToken, TestItem, TestMessage } from 'vscode';
import { spawn } from 'child_process';

// Updates the tests run results based on busted json response.
const updateRunResults = (results: any, run: TestRun, group: TestItem) => {

    const { successes, failures, pendings, errors } = results;

    const states = [successes, failures, pendings, errors];

    for (const state of states) {
        for (const result of state) {

            const caseId = getTestCaseId(group.uri!, result.name);
            const testCase = group.children.get(caseId);

            if (!testCase) { continue; }

            const duration = 1000 * result.element.duration;
            const message = new TestMessage(result.trace.traceback);
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
        const message = new TestMessage("");
        run.failed(group, message, duration);
    } else if (errors.length > 0) {
        const message = new TestMessage("");
        run.errored(group, message, duration);
    } else if (pendings.length > 0) {
        run.skipped(group);
    } else {
        run.passed(group, duration);
    }
};

export const executor = async (ctrl: TestController, request: TestRunRequest, token: CancellationToken) => {

    const run = ctrl.createTestRun(request);
    const _queue: TestItem[] = [];

    if (request.include) {
        request.include.forEach((test) => _queue.push(test));
    } else {
        ctrl.items.forEach((test) => _queue.push(test));
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

    const runTestFile = async (test: TestItem) => {

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
                    const message = new TestMessage("Error parsing json input.");
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