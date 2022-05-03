import * as vscode from 'vscode';
import { assert } from 'chai';
import {
    findTestNode,
    createTestNode,
    createTestBranch,
    deleteTestNode,
    testMap
} from '../../src/tree';

suite('findTestNode', () => {
    test('returns undefined when there are not tests', () => {
        const result = findTestNode(vscode.Uri.file('/'));
        assert.isUndefined(result);
    });
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
        assert.isUndefined(testMap.get('/root'));
        assert.isObject(testMap.get('/test1.lua'));
        assert.isObject(testMap.get('/subspec'));
        assert.isObject(testMap.get('/subspec/test2.lua'));
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

    createTestBranch(ctrlTest, '/', ['test1.lua']);

    test('removed test case from test tree', () => {
        assert.isObject(ctrlTest.items.get('/test1.lua'));
        deleteTestNode(ctrlTest, testMap.get('/test1.lua')!);
        assert.isUndefined(ctrlTest.items.get('/test1.lua'));
    });

    createTestBranch(ctrlTest, '/', ['spec', 'test2.lua']);

    test('removes children cases from test map', () => {
        assert.isObject(testMap.get('/spec'));
        assert.isObject(testMap.get('/spec/test2.lua'));
        deleteTestNode(ctrlTest, testMap.get('/spec')!);
        assert.isUndefined(testMap.get('/spec'));
        assert.isUndefined(testMap.get('/spec/test2.lua'));
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

        assert.isObject(findTestNode(wsUri));
        assert.isObject(findTestNode(specUri));
        assert.isObject(findTestNode(testUri));
    });

    ctrlTest.dispose();
});