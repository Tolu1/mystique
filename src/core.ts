import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { TextDecoder, TextEncoder } from 'util';
import * as recast from 'recast';
import { v4 as uuid4 } from 'uuid';
import path = require('path');

// ===============================================================================================================

export class Mystique {

    public name: string;
    private config: any = {};
    private rootDir: string = '';
    private activeFileName: string = '';
    private appFiles: string[] = [];
    public appForest: any[] = [];
    
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

        this.createConfiguration()
        .then(async config => {
            this.config = config; // Issue: returns undefined when it encounters bad JSON in config file
            await this.watchDevelopment();
            this.appForest.forEach(tree => {
                console.log(`App Tree: `);
                console.log(tree);
            });
        })
        .catch(err => {
            console.error(err);
        });   
    }

    private getNewConfiguration(): string {
        return `{
    "mistiqueID": "${uuid4()}",
    "settings": {
        "version": "1.0.0",
        "mode": "auto",
        "target": ["${Helper.correctFilePathForJSON(this.activeFileName)}"],
        "preserve": true
    }
}`;
    }

    private async createConfiguration(forced=false): Promise<any> {
        const path = this.rootDir + '/mistique.json';
        return fs.pathExists(path)
        .then(async val => { 
            let preserve = true;    
            if (val) {
                // Do not update preserved configuration
                let uri = vscode.Uri.file(path);
                let data = await vscode.workspace.fs.readFile(uri);
                let str = Helper.decodeText(data);
                try {
                    let config = JSON.parse(str);
                    preserve = config.settings.preserve;
                    return config;
                } catch (err) {
                    console.error(err);
                    vscode.window.showErrorMessage('Bad JSON in mystique.json');                
                }
            } 
            if (!val || !preserve) {
                let uri = vscode.Uri.file(path);
                let config = this.getNewConfiguration();
                let data = Helper.encodeText(config);
                vscode.workspace.fs.writeFile(uri, data)
                .then(() => {
                    config = JSON.parse(config);
                    vscode.window.showInformationMessage('Configuration set up completed');
                    return config;
                }, err => {
                    vscode.window.showErrorMessage('Configuration set up failed');
                    console.log(err);
                });
            }
        });
    };

    private async createServer() {
        // fs.createFile('./');
    };

    public async updateServer() {
        
    };

    // Listen on changes to app sources during development 
    private async watchDevelopment() {  
        if (this.config.settings.target.includes('*')) {
            this.getAppFiles()
            .then((files) => {
                this.appFiles = files;
            });
        } else {
            this.appFiles = this.config.settings.target; // TODO: Check validity of paths 
        }    
        
        // Convert sources to AST
        for await (let fp of this.appFiles) {
            let tree = await Mystique.parseSource(fp);
            this.appForest.push(tree);
        }
    };

    private static async parseSource(sourcePath: string): Promise<string> {
        let uri = vscode.Uri.file(sourcePath);
        return vscode.workspace.fs.readFile(uri)
        .then(async data => {
            let str = Helper.decodeText(data);
            let ast = recast.parse(str, {parser: require('acorn')});            
            return ast;           
        }, err => {
            console.error(err);
        });
    };

    private async getAppFiles(path=this.rootDir): Promise<string[]> {
        let appFiles: string[] = [];
        let uri = vscode.Uri.file(path);
        return vscode.workspace.fs.readDirectory(uri)
        .then(async dirs => {
            for await (let dir of dirs) {
                if (dir[0].endsWith('.js') && dir[1] === 1) {
                        appFiles.push(path + '/' + dir[0]);
                    } else if (dir[1] === 2) {
                        let files = await this.getAppFiles(path + '/' + dir[0]);
                        appFiles = appFiles.concat(files);                 
                    }
            }
            return appFiles;
        });    
    }
};

// ===============================================================================================================

class Helper {

    public static encodeText(text: string) {
        return new TextEncoder().encode(text);
    };

    public static decodeText(uint8array: Uint8Array) {
        return new TextDecoder().decode(uint8array);
    }

    public static correctFilePathForJSON(path: string): string {
        let chars = path.split('');
        for (let i = 0; i < chars.length; i++) {
            if (chars[i] === '\\') {
                chars[i] = '/';
            }
        }
        return chars.join('');
    } 
    
};