import * as vscode from 'vscode';
import { assert } from 'chai';
import {
    findTestNode,
    createTestNode,
    createTestBranch,
    deleteTestNode
} from '../../src/tree';


suite('findTestNode', () => {
    const ctrlTest = vscode.tests.createTestController('busted', 'busted');

    test('returns undefined when there are not tests', () => {
        const workspace = { index: -1, name: "", uri: vscode.Uri.file('/') };
        const file = vscode.Uri.file('/test');
        const result = findTestNode(ctrlTest, workspace, file);
        assert.isUndefined(result);
    });

    ctrlTest.dispose();
});

suite('createTestBranch', () => {
    const ctrlTest = vscode.tests.createTestController('busted', 'busted');

    test('works on plain test cases', () => {
        const result = createTestBranch(ctrlTest, '/', ['test1.lua']);
        assert.isObject(result);
    });

    test('works on nested test cases', () => {
        const result = createTestBranch(ctrlTest, '/', ['subspec', 'test2.lua']);
        assert.isOk(result);
    });

    test('adds test cases to the test map', () => {
        const workspace = { index: -1, name: '', uri: vscode.Uri.file('/') };
        assert.isUndefined(findTestNode(ctrlTest, workspace, vscode.Uri.file('/root')));
        assert.isObject(findTestNode(ctrlTest, workspace, vscode.Uri.file('/test1.lua')));
        assert.isObject(findTestNode(ctrlTest, workspace, vscode.Uri.file('/subspec')));
        assert.isObject(findTestNode(ctrlTest, workspace, vscode.Uri.file('/subspec/test2.lua')));
    });

    test('adds test cases to test tree', () => {
        assert.isUndefined(ctrlTest.items.get('/root'));
        assert.isObject(ctrlTest.items.get('/test1.lua'));
        const subspec = ctrlTest.items.get('/subspec');
        assert.isObject(subspec?.children?.get('/subspec/test2.lua'));
    });

    ctrlTest.dispose();
});

suite('deleteTestNode', () => {
    const ctrlTest = vscode.tests.createTestController('busted', 'busted');

    createTestBranch(ctrlTest, '/', ['spec', 'test2.lua']);

    test('removes children cases from test tree', () => {
        const workspace = { index: -1, name: '', uri: vscode.Uri.file('/') };
        assert.isObject(findTestNode(ctrlTest, workspace, vscode.Uri.file('/spec')));
        assert.isObject(findTestNode(ctrlTest, workspace, vscode.Uri.file('/spec/test2.lua')));

        deleteTestNode(ctrlTest, findTestNode(ctrlTest, workspace, vscode.Uri.file('/spec'))!);

        assert.isUndefined(findTestNode(ctrlTest, workspace, vscode.Uri.file('/spec')));
        assert.isUndefined(findTestNode(ctrlTest, workspace, vscode.Uri.file('/spec/test2.lua')));
    });

    ctrlTest.dispose();
});

suite('createTestNode', () => {
    const ctrlTest = vscode.tests.createTestController('busted', 'busted');

    test('creates a test branch', () => {
        const wsUri = vscode.Uri.file('/home/module');
        const specUri = vscode.Uri.file('/home/module/spec');
        const testUri = vscode.Uri.file('/home/module/spec/test.lua');

        const workspace = {
            uri: wsUri, name: 'module', index: 0
        };

        createTestNode(ctrlTest, workspace, testUri);

        assert.isObject(findTestNode(ctrlTest, workspace, wsUri));
        assert.isObject(findTestNode(ctrlTest, workspace, specUri));
        assert.isObject(findTestNode(ctrlTest, workspace, testUri));
    });

    ctrlTest.dispose();
});