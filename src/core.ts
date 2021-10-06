import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { TextDecoder, TextEncoder } from 'util';
import * as recast from 'recast';
import { v4 as uuid4 } from 'uuid';

// ========================================================= MYSTIQUE CLASS =========================================================

export class Mystique {

    public name: string;
    private config: any = {};
    private rootDir: string = '';
    private activeFileName: string = '';
    private appFiles: any[] = [];
    public appForest: any[] = [];
    
    constructor() {
        
        this.name = 'Raven';

    };

    // Starts up Mystique
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
            this.config = config; // ISSUE: returns undefined when it encounters bad JSON in config file
            this.monitorFrontend();
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

    // Create and store Mystique settings
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

    };

    public async updateServer() {
        
    };
 

    // Monitor development as a whole
    private async monitorFrontend() {  

        const files = async () => {
            if (this.config.settings.target.includes('*')) {
                let files = await this.getAppFiles();
                return files;
            } else {
                return this.config.settings.target; // TODO: Check validity of paths 
            }
        };
        this.appFiles = await files();

        for await (let fp of this.appFiles) {
            this.monitor(fp);
        }
    };

    // Monitor changes in a source
    public async monitor(sourcePath: string) {
        let tree: any;
        let uri = vscode.Uri.file(sourcePath);
        vscode.workspace.openTextDocument(uri)
        .then(document => {
            vscode.workspace.onDidChangeTextDocument(async event => {
                if (event.document === document) {
                    console.log(`Detected changes in: ${sourcePath}`);
                    // TODO: Look for a more efficient way to watch files 
                    // without having to store the whole document everytime
                    //
                    // NOTE: It might be better to wait for a save before trying to parse
                    try {
                        tree = await Mystique.parseSource(document.getText()); 
                        this.appForest.push(tree);
                        console.log('Tree: ');
                        console.log(tree);
                        
                    } catch (err) {                        
                        // Ignore bad JS
                    }
                }         
                else {
                    // Ignore other documents
                }
            });
        }, err => {
            console.error(err);
        });
    }

    // Primitive implementation of an API mocking approach using a set of bare-bones heuristics 
    private static async mock() {

    }

    // Source to AST parser
    private static async parseSource(source?: string, sourcePath?: string): Promise<any> {
        if (typeof source !== 'undefined') {
            let tree = recast.parse(source, {parser: require('acorn')});            
            return tree;
        } else if (typeof sourcePath !== 'undefined') {
            let uri = vscode.Uri.file(sourcePath);
            return vscode.workspace.fs.readFile(uri)
            .then(async data => {
                let str = Helper.decodeText(data);
                let tree = recast.parse(str, {parser: require('acorn')});            
                return tree;           
            }, err => {
                console.error(err);
            });
        } else {
            throw new Error('No arguments were passed');
        }
        
    };

    // Get essential source files for the frontend app
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

// ========================================================= HELPER CLASS =========================================================

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
