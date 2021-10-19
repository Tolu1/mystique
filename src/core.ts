import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { TextDecoder, TextEncoder } from 'util';
import * as acorn from 'acorn';
import * as recast from 'recast';
import { v4 as uuid4 } from 'uuid';
import { visit } from 'ast-types';
import { assert } from 'console';

// ========================================================= LOGGING =========================================================

// const winston = require('winston');

// const logger = winston.createLogger({
//   level: 'info',
//   format: winston.format.json(),
//   defaultMeta: { service: 'user-service' },
//   transports: [
//     new winston.transports.File({ filename: 'error.log', level: 'error' }),
//     new winston.transports.File({ filename: 'combined.log' }),
//   ],
// });

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
            this.createServer();
        })
        .catch(err => {
            console.error(err);
        });   
    }

    private getNewConfiguration(): string {
        return `{
    "mystiqueID": "${uuid4()}",
    "settings": {
        "version": "1.0.0",
        "mode": "auto",
        "rootDir": "${Helper.correctFilePathForJSON(this.rootDir)}",
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
            let config = undefined;
            let preserve = true;    
            if (val) {
                // Do not update preserved configuration
                let uri = vscode.Uri.file(path);
                let data = await vscode.workspace.fs.readFile(uri);
                let str = Helper.decodeText(data);
                try {
                    config = JSON.parse(str);
                    preserve = config.settings.preserve;
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
                }, err => {
                    vscode.window.showErrorMessage('Configuration set up failed');
                    console.log(err);
                });
            }
            return config;
        });
    };

    private async createServer() {
        let template = `
`;
        fs.createFile(`./.mocks/${this.config.mystiqueID}.js`);
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
            // BUG: Detects two changes for one change at the start up of the extension?
            vscode.workspace.onDidChangeTextDocument(async event => {
                if (event.document === document) {
                    let sourceID = Helper.correctFilePathForJSON(document.uri.fsPath); // Identify by Path
                    console.log(`Detected changes in: ${sourcePath}`);
                    // debugger;
                    // TODO: Look for a more efficient way to watch files 
                    // without having to store the whole document everytime
                    //
                    // NOTE: It might be better to wait for a save before trying to parse
                    try {
                        tree = await Mystique.parseSource(document.getText());
                        const find = this.appForest.filter(treeObj => {
                            return treeObj.sourceID === sourceID;
                        }).length;

                        if (find === 1) {
                            let i = this.appForest.findIndex(treeObj => {
                                return treeObj.sourceID === sourceID;
                            });
                            this.appForest[i].tree = tree;
                        } else if (find === 0) {
                            this.appForest.push({sourceID: `${sourceID}`, tree: tree}); 
                        } else {
                            throw new Error('More than one source ID was found in instance variable --> appForest');
                        }
                                            
                        this.shapeshiftAPI(this.appForest);
                        
                    } catch (err) {    
                        console.error(err); // TODO: Catch other errors          
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
    
    // Primitive implementation of a source code to API mocking approach using a set of bare-bones heuristics, for now 
    private async shapeshiftAPI(forest: any[]) {
        console.log('shapeshifting API');
        let builder = new APIFather();
        
        forest.forEach(tree => {
            builder.extractAPIs(tree, 'AST');
        });
        console.log('Done.');
        console.log('------------------------------------------');
        console.log('==========================================');
    }

    // Provide data for mocked entities 
    private static async mock() {

    }

    // Source to AST parser
    private static async parseSource(source?: string, sourcePath?: string): Promise<any> {
        if (typeof source !== 'undefined') {
            let tree = acorn.parse(source, {ecmaVersion: 'latest'});        
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

// ========================================================= API FATHER CLASS =========================================================

class APIFather {

    static sourceTypes: string[] = ['AST', 'HTML'];

    public extractAPIs(source: string, sourceType: string) {
        assert(APIFather.sourceTypes.includes(sourceType));

        /** 
         * Hardcoded heuristics that should detect for APIs and their data from sources
         * NOTE: An ANN could provide more optimal logic here
         */
        if (sourceType === 'AST') {
            
            /** 
             * Traverse AST and parse URLs and options for the Fetch API
             */
            let getFetch = (tree: any) => {
                let count = 0;
                visit(tree, {
                    visitCallExpression: function (path) {                        
                        
                        if (path.value.callee.type === 'Identifier' && path.value.callee.name === 'fetch') {
                            console.log('Detected use of Fetch');
                            ++count;
                            // console.log(path);                            

                            function readArgs(path: any) {
                                return path.value.arguments;
                            }
                            
                            // When .then is used to resolve Fetch promise
                            function hasThenBlock(path: any) {
                                let pathThenBlock = path.parentPath.parentPath;
                                try {
                                    if (pathThenBlock.value.callee.property.name === 'then') {
                                        return true;
                                } else {
                                    return false;
                                }
                                } catch (err) {
                                    console.error(err);
                                    return false;
                                }
                            };                            

                            function nextThenBlock(pathThenBlock: any) {
                                if (hasThenBlock(pathThenBlock)) {
                                    return readArgs(pathThenBlock);
                                } else {
                                    return false;
                                }
                            }

                            function getFunctionBody() {
                                return null;
                            }

                            function getDataIdentifier(pathThenBlock: any) {
                                let identifierExists = false;
                                let path = pathThenBlock;
                                while (!identifierExists) {
                                    let args = readArgs(path);
                                    
                                    if (args.length > 0) {
                                        let callback = args[0];
                                        console.log(callback);     
                                    }                                    
                                    debugger;
                                    // let body = getFunctionBody()
                                    if (path.value) {
                                    } else {
                                        path = nextThenBlock(path);
                                        debugger;
                                        if (!path) {
                                            return null;
                                        }
                                    }
                                }
                            }   
                            
                            // Get Fetch Arguments
                            const fetchArgs = readArgs(path);
                            if (fetchArgs.length > 0) {
                                console.log(`url: ${fetchArgs[0].value}`);                     
                            }

                            // Scenario Await
                            try {
                                if (path.parentPath.value.type === 'AwaitExpression') {
                                    console.log(path);
                                }                        
                            } catch (err) {
                                // Ignore errors
                            }

                            // Scenario Then
                            /* if (hasThenBlock(path)) {
                                let pathThenBlock = readArgs(path);
                                getDataIdentifier(pathThenBlock);
                            } */
                        } 
                        this.traverse(path);
                    }
                });
                console.log(`Fetch was used ${count} times`);
            };
            getFetch(source);
        }
    }
}

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
