import { Uri } from 'vscode';


export const getTestCaseId = (uri: Uri, name: string) => {
    return uri.path.trim() + ":" + name.trim();
};
