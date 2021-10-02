import * as vscode from 'vscode';
import { Mystique } from './core';
export function activate(context: vscode.ExtensionContext) {
	
	const myst = new Mystique();
	console.log('Mystique is now active!');

	context.subscriptions.push(
		vscode.commands.registerCommand('mystique.whenActive', () => {
			vscode.window.showInformationMessage('Mystique is now running in the background');
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('mystique.shapeShift', () => {
			vscode.window.showInformationMessage(`Mystique(${myst.name}) is shapeshifting`);
		})
	);
}

export function deactivate() {
	console.log('Mystique is no longer active!');
}
