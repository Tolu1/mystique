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
			myst.loadInstance();
			// vscode.window.showInformationMessage(`Mystique (${myst.name}) is shapeshifting`);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('mystique.terminate', () => {
			vscode.window.showInformationMessage('Mystique was terminated by you');
		})
	);
}

export function deactivate() {
	console.log('Mystique is no longer active.');
}
