import * as vscode from 'vscode';
import { assert } from 'chai';
import {
    findTestNode,
    createTestNode,
    createTestBranch,
    deleteTestNode
} from '../../src/tree';

let ctrlTest: vscode.TestController;

suiteSetup(async () => {
    ctrlTest = vscode.tests.createTestController('busted', 'busted');
});

suiteTeardown(async () => {
    ctrlTest.dispose();
});

function fileUri(filename: string) {
    return vscode.Uri.file(filename);
}

function workspaceFolder(dirname: string) {
    return { index: 0, name: "", uri: fileUri(dirname) };
}

suite('findTestNode', () => {

    test('returns undefined when there are not tests', () => {
        const workspace = workspaceFolder('/');
        const file = fileUri('/test');
        const result = findTestNode(ctrlTest, workspace, file);
        assert.isUndefined(result);
    });

});

suite('createTestBranch', () => {

    test('works on plain test cases', () => {
        const result = createTestBranch(ctrlTest, '/', ['test1.lua']);
        assert.isObject(result);
    });

    test('works on nested test cases', () => {
        const result = createTestBranch(ctrlTest, '/', ['subspec', 'test2.lua']);
        assert.isOk(result);
    });

    test('adds test cases to the test tree', () => {
        const workspace = workspaceFolder('/');

        assert.isUndefined(findTestNode(ctrlTest, workspace, fileUri('/root')));
        assert.isObject(findTestNode(ctrlTest, workspace, fileUri('/test1.lua')));
        assert.isObject(findTestNode(ctrlTest, workspace, fileUri('/subspec')));
        assert.isObject(findTestNode(ctrlTest, workspace, fileUri('/subspec/test2.lua')));
    });

});

suite('deleteTestNode', () => {

    test('removes children cases from test tree', () => {
        createTestBranch(ctrlTest, '/', ['spec', 'test2.lua']);
        const workspace = workspaceFolder('/');

        assert.isObject(findTestNode(ctrlTest, workspace, fileUri('/spec')));
        assert.isObject(findTestNode(ctrlTest, workspace, fileUri('/spec/test2.lua')));

        deleteTestNode(ctrlTest, findTestNode(ctrlTest, workspace, fileUri('/spec'))!);

        assert.isUndefined(findTestNode(ctrlTest, workspace, fileUri('/spec')));
        assert.isUndefined(findTestNode(ctrlTest, workspace, fileUri('/spec/test2.lua')));
    });

});

suite('createTestNode', () => {
    test('creates a test branch', () => {
        const workspace = workspaceFolder('/home');
        const specUri = fileUri('/home/module/spec');
        const testUri = fileUri('/home/module/spec/test.lua');

        createTestNode(ctrlTest, workspace, testUri);

        assert.isObject(findTestNode(ctrlTest, workspace, workspace.uri));
        assert.isObject(findTestNode(ctrlTest, workspace, specUri));
        assert.isObject(findTestNode(ctrlTest, workspace, testUri));
    });
});
