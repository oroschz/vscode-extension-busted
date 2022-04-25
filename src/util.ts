import { Uri, TestItem } from 'vscode';


export const getTestCaseId = (uri: Uri, name: string) => {
    return uri.path.trim() + ":" + name.trim();
};

export const getChildCase = (group: TestItem, label: string) => {
    const caseId = getTestCaseId(group.uri!, label);
    return group.children.get(caseId);
};