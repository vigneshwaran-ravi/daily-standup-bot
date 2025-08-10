// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import {
  configureOpenAI,
  configureGemini,
  switchProvider,
  generateDailyStandup,
  configureSlack,
  testSlackConnection,
} from "./commands";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // configure openai command
  const configureOpenAIDisposable = vscode.commands.registerCommand(
    "daily-standup-bot.configureOpenAI",
    async () => {
      await configureOpenAI(context);
    }
  );
  // configure gemini command
  const configureGeminiDisposable = vscode.commands.registerCommand(
    "daily-standup-bot.configureGemini",
    async () => {
      await configureGemini(context);
    }
  );

  // switch provider command
  const switchProviderDisposable = vscode.commands.registerCommand(
    "daily-standup-bot.switchProvider",
    async () => {
      await switchProvider();
    }
  );

  // generate standup command
  const generateStandupDisposable = vscode.commands.registerCommand(
    "daily-standup-bot.generateStandup",
    async () => {
      await generateDailyStandup(context);
    }
  );

  // configure slack command
  const configureSlackDisposable = vscode.commands.registerCommand(
    "daily-standup-bot.configureSlack",
    async () => {
      await configureSlack(context);
    }
  );

  // test slack command
  const testSlackDisposable = vscode.commands.registerCommand(
    "daily-standup-bot.testSlack",
    async () => {
      await testSlackConnection(context);
    }
  );

  context.subscriptions.push(
    configureOpenAIDisposable,
    configureGeminiDisposable,
    switchProviderDisposable,
    generateStandupDisposable,
    configureSlackDisposable,
    testSlackDisposable
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
