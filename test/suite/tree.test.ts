import * as assert from 'assert';
import * as vscode from 'vscode';
import { findTestNode, createTestBranch, deleteTestNode } from '../../src/tree';

suite('findTestNode', () => {
    test('returns undefined when there are not tests', () => {
        const result = findTestNode(vscode.Uri.file('/'));
        assert.ifError(result);
    });
});

suite('createTestBranch', () => {
    const ctrlTest = vscode.tests.createTestController('busted', 'busted');

    test('works on plain test cases', () => {
        const result = createTestBranch(ctrlTest, '/', ['test1.lua']);
        assert.ok(result);
    });

    test('works on nested test cases', () => {
        const result = createTestBranch(ctrlTest, '/', ['subspec', 'test2.lua']);
        assert.ok(result);
    });

    test('adds test cases to the test map', () => {
        assert.ifError(findTestNode(vscode.Uri.file('/root')));
        assert.ok(findTestNode(vscode.Uri.file('/test1.lua')));
        assert.ok(findTestNode(vscode.Uri.file('/subspec')));
        assert.ok(findTestNode(vscode.Uri.file('/subspec/test2.lua')));
    });

    test('adds test cases to test tree', () => {
        assert.ifError(ctrlTest.items.get('/root'));
        assert.ok(ctrlTest.items.get('/test1.lua'));
        const subspec = ctrlTest.items.get('/subspec');
        assert.ok(subspec);
        assert.ok(subspec.children?.get('/subspec/test2.lua'));
    });

    ctrlTest.dispose();
});

suite('deleteTestNode', () => {
    const ctrlTest = vscode.tests.createTestController('busted', 'busted');

    const testUri1 = vscode.Uri.file('/test1.lua');
    const testNode1 = ctrlTest.createTestItem(testUri1.path, 'test1.lua', testUri1);
    ctrlTest.items.add(testNode1);

    test('removed test case from test tree', () => {
        assert.ok(ctrlTest.items.get(testUri1.path));
        deleteTestNode(ctrlTest, testNode1);
        assert.ifError(ctrlTest.items.get(testUri1.path));
    });

    ctrlTest.dispose();
});