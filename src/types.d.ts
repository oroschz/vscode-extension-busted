type TestCaseResult = {
    name: string,
    element: {
        duration: number,
    }
    trace: {
        traceback: string
    }
}

type TestRunResult = {
    successes: TestCaseResult[],
    failures: TestCaseResult[],
    pendings: TestCaseResult[],
    errors: TestCaseResult[],
    duration: number
}