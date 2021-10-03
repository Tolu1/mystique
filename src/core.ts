import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { TextDecoder, TextEncoder } from 'util';
import * as recast from 'recast';
import { v4 as uuid4 } from 'uuid';
import path = require('path');

class Helper {

    public static correctFilePath(path: string): string {
        let chars = path.split('');
        for (let i = 0; i < chars.length; i++) {
            if (chars[i] === '\\') {
                chars[i] = '/';
            }
        }
        return chars.join('');
    } 
    
}

export class Mystique {

    public name: string;
    private rootDir: string = '';
    private activeFileName: string = '';
    
    constructor() {
        
        this.name = 'Raven';

    };

    public async loadInstance() {
        if(vscode.workspace.workspaceFolders !== undefined) {
            this.rootDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
        } else {
            return vscode.window.showErrorMessage('Mystique did not find a working folder, please try again');
        }

        // TODO: Check for when command is run in context of explorer and not editor
        if (vscode.window.activeTextEditor !== undefined) {
            this.activeFileName = vscode.window.activeTextEditor.document.fileName;
        }

        this.createConfiguration();
    }

    private getNewConfiguration(): string {
        return `{
    "mistiqueID": "${uuid4()}",
    "settings": {
        "version": "1.0.0",
        "mode": "auto",
        "target": ["${Helper.correctFilePath(this.activeFileName)}"],
        "preserve": true
    }
}`;
    }

    private async createConfiguration(forced=false) {
        const path = this.rootDir + '/mistique.json';
        fs.pathExists(path)
        .then(async val => { 
            let preserve = true;     
            if (val) {
                // Do not update preserved configuration
                let uri = vscode.Uri.file(path);
                let data = await vscode.workspace.fs.readFile(uri);
                let str = Mystique.decodeText(data);
                try {
                    let object = JSON.parse(str);
                    preserve = object.settings.preserve;
                } catch (err) {
                    console.log(err);
                    vscode.window.showErrorMessage('Bad JSON in mystique.json');
                    return;
                }
            } 
            if (!val || !preserve) {
                let uri = vscode.Uri.file(path);
                let data = Mystique.encodeText(this.getNewConfiguration());
                vscode.workspace.fs.writeFile(uri, data)
                .then(() => {
                    vscode.window.showInformationMessage('Configuration set up completed');
                }, err => {
                    vscode.window.showErrorMessage('Configuration set up failed');
                    console.log(err);
                });
            }
        })
        .catch(err => {
            console.log(err);
        });
    };

    private async createServer() {
        
    };

    public async updateServer() {

    };

    public async watchFile() {

    };

    private static async parseSource(source: string) {

    };

    private static encodeText(text: string) {
        return new TextEncoder().encode(text);
    };

    private static decodeText(uint8array: Uint8Array) {
        return new TextDecoder().decode(uint8array);
    }
};