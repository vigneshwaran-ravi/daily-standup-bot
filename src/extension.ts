// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import GitService from "./services/git-services";
import { createAIService } from "./services/ai-services";
import { createSlackService } from "./services/slack-services";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "daily-standup-bot" is now active!'
  );

  // Register commands
  const helloWorldDisposable = vscode.commands.registerCommand(
    "daily-standup-bot.helloWorld",
    () => {
      vscode.window.showInformationMessage(
        "Hello World from Daily Standup Bot!"
      );
    }
  );

  const configureOpenAIDisposable = vscode.commands.registerCommand(
    "daily-standup-bot.configureOpenAI",
    async () => {
      await configureOpenAI(context);
    }
  );

  const configureGeminiDisposable = vscode.commands.registerCommand(
    "daily-standup-bot.configureGemini",
    async () => {
      await configureGemini(context);
    }
  );

  const switchProviderDisposable = vscode.commands.registerCommand(
    "daily-standup-bot.switchProvider",
    async () => {
      await switchProvider();
    }
  );

  const generateStandupDisposable = vscode.commands.registerCommand(
    "daily-standup-bot.generateStandup",
    async () => {
      await generateDailyStandup(context);
    }
  );

  const configureSlackDisposable = vscode.commands.registerCommand(
    "daily-standup-bot.configureSlack",
    async () => {
      await configureSlack(context);
    }
  );

  const testSlackDisposable = vscode.commands.registerCommand(
    "daily-standup-bot.testSlack",
    async () => {
      await testSlackConnection(context);
    }
  );

  context.subscriptions.push(
    helloWorldDisposable,
    configureOpenAIDisposable,
    configureGeminiDisposable,
    switchProviderDisposable,
    generateStandupDisposable,
    configureSlackDisposable,
    testSlackDisposable
  );
}

async function configureOpenAI(context: vscode.ExtensionContext) {
  const apiKey = await vscode.window.showInputBox({
    prompt: "Enter your OpenAI API Key",
    password: true,
    placeHolder: "sk-...",
  });

  if (apiKey) {
    // Store API key securely
    await context.secrets.store("openai-api-key", apiKey);

    // Ask for model preference
    const model = await vscode.window.showQuickPick(
      ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4o"],
      {
        placeHolder: "Select OpenAI model",
      }
    );

    if (model) {
      const config = vscode.workspace.getConfiguration("daily-standup-bot");
      await config.update(
        "openai.model",
        model,
        vscode.ConfigurationTarget.Global
      );
    }

    vscode.window.showInformationMessage("OpenAI configuration saved!");
  }
}

async function configureGemini(context: vscode.ExtensionContext) {
  const apiKey = await vscode.window.showInputBox({
    prompt: "Enter your Gemini API Key",
    password: true,
    placeHolder: "AIza...",
  });

  if (apiKey) {
    // Store API key securely
    await context.secrets.store("gemini-api-key", apiKey);

    // Ask for model preference
    const model = await vscode.window.showQuickPick(
      ["gemini-pro", "gemini-2.0-flash", "gemini-1.5-pro"],
      {
        placeHolder: "Select Gemini model",
      }
    );

    if (model) {
      const config = vscode.workspace.getConfiguration("daily-standup-bot");
      await config.update(
        "gemini.model",
        model,
        vscode.ConfigurationTarget.Global
      );
    }

    vscode.window.showInformationMessage("Gemini configuration saved!");
  }
}

async function switchProvider() {
  const config = vscode.workspace.getConfiguration("daily-standup-bot");
  const currentProvider = config.get<string>("provider", "gemini");

  const provider = await vscode.window.showQuickPick(
    [
      {
        label: "OpenAI (ChatGPT)",
        description: currentProvider === "openai" ? "Currently selected" : "",
        value: "openai",
      },
      {
        label: "Google Gemini",
        description: currentProvider === "gemini" ? "Currently selected" : "",
        value: "gemini",
      },
    ],
    {
      placeHolder: "Select AI provider",
    }
  );

  if (provider && provider.value !== currentProvider) {
    await config.update(
      "provider",
      provider.value,
      vscode.ConfigurationTarget.Global
    );
    vscode.window.showInformationMessage(`Switched to ${provider.label}`);
  }
}

async function generateDailyStandup(context: vscode.ExtensionContext) {
  try {
    vscode.window.showInformationMessage("Generating daily standup...");

    // Step 1: Get today's commit messages
    const gitService = new GitService();
    const todayCommitMessages = await gitService.getTodaysCommitMessages();
    console.log("todayCommitMessages", todayCommitMessages);

    if (!todayCommitMessages || todayCommitMessages.length === 0) {
      vscode.window.showWarningMessage("No commits found for today.");
      return;
    }

    // Step 2: Get AI service configuration
    const config = vscode.workspace.getConfiguration("daily-standup-bot");
    const provider = config.get<string>("provider", "gemini") as
      | "openai"
      | "gemini";

    let apiKey: string | undefined;
    let model: string;

    if (provider === "openai") {
      apiKey = await context.secrets.get("openai-api-key");
      model = config.get<string>("openai.model", "gpt-3.5-turbo");

      if (!apiKey) {
        const result = await vscode.window.showWarningMessage(
          "OpenAI API key not configured. Would you like to configure it now?",
          "Configure",
          "Cancel"
        );
        if (result === "Configure") {
          await configureOpenAI(context);
          return;
        }
        return;
      }
    } else {
      apiKey = await context.secrets.get("gemini-api-key");
      model = config.get<string>("gemini.model", "gemini-2.0-flash");

      if (!apiKey) {
        const result = await vscode.window.showWarningMessage(
          "Gemini API key not configured. Would you like to configure it now?",
          "Configure",
          "Cancel"
        );
        if (result === "Configure") {
          await configureGemini(context);
          return;
        }
        return;
      }
    }

    // Step 3: Generate summary using AI
    const aiService = createAIService(provider, { apiKey, model });
    const summary = await aiService.summarizeCommits(todayCommitMessages);

    // Step 4: Show result to user
    const result = await vscode.window.showInformationMessage(
      "Daily standup generated! What would you like to do?",
      "View Summary",
      "Copy to Clipboard",
      "Send to Slack"
    );

    if (result === "View Summary") {
      // Create and show a new document with the summary
      const doc = await vscode.workspace.openTextDocument({
        content: `# Daily Standup - ${new Date().toDateString()}\n\n${summary}`,
        language: "markdown",
      });
      await vscode.window.showTextDocument(doc);
    } else if (result === "Copy to Clipboard") {
      await vscode.env.clipboard.writeText(summary);
      vscode.window.showInformationMessage("Summary copied to clipboard!");
    } else if (result === "Send to Slack") {
      await sendToSlack(context, summary, todayCommitMessages.length);
    }
  } catch (error) {
    console.error("Error generating standup:", error);
    vscode.window.showErrorMessage(
      `Failed to generate standup: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function configureSlack(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("daily-standup-bot");

  const method = await vscode.window.showQuickPick(
    [
      {
        label: "Webhook URL",
        description: "Simple webhook integration (recommended)",
        value: "webhook",
      },
      {
        label: "Bot Token",
        description: "Full Slack API integration",
        value: "bot",
      },
    ],
    {
      placeHolder: "Select Slack integration method",
    }
  );

  if (!method) {
    return;
  }

  if (method.value === "webhook") {
    const webhookUrl = await vscode.window.showInputBox({
      prompt: "Enter your Slack webhook URL",
      password: true,
      placeHolder: "https://hooks.slack.com/services/...",
    });

    if (webhookUrl) {
      await context.secrets.store("slack-webhook-url", webhookUrl);
      vscode.window.showInformationMessage("Slack webhook URL saved!");
    }
  } else {
    const botToken = await vscode.window.showInputBox({
      prompt: "Enter your Slack bot token",
      password: true,
      placeHolder: "xoxb-...",
    });

    if (botToken) {
      await context.secrets.store("slack-bot-token", botToken);
      vscode.window.showInformationMessage("Slack bot token saved!");
    }
  }

  // Ask for default channel
  const channel = await vscode.window.showInputBox({
    prompt: "Enter default Slack channel",
    placeHolder: "#general",
  });

  if (channel) {
    await config.update(
      "slack.defaultChannel",
      channel,
      vscode.ConfigurationTarget.Global
    );
  }

  // Ask for bot username
  const username = await vscode.window.showInputBox({
    prompt: "Enter bot display name",
    placeHolder: "AI Commit Bot",
  });

  if (username) {
    await config.update(
      "slack.botUsername",
      username,
      vscode.ConfigurationTarget.Global
    );
  }
}

async function testSlackConnection(context: vscode.ExtensionContext) {
  try {
    const config = vscode.workspace.getConfiguration("daily-standup-bot");
    const webhookUrl = await context.secrets.get("slack-webhook-url");
    const botToken = await context.secrets.get("slack-bot-token");

    if (!webhookUrl && !botToken) {
      const result = await vscode.window.showWarningMessage(
        "Slack not configured. Would you like to configure it now?",
        "Configure",
        "Cancel"
      );
      if (result === "Configure") {
        await configureSlack(context);
      }
      return;
    }

    const slackService = createSlackService({
      webhookUrl,
      botToken,
      defaultChannel: config.get<string>("slack.defaultChannel", "#general"),
      defaultUsername: config.get<string>("slack.botUsername", "AI Commit Bot"),
      defaultIcon: config.get<string>("slack.botIcon", ":robot_face:"),
    });

    vscode.window.showInformationMessage("Testing Slack connection...");
    const result = await slackService.testConnection();

    if (result.success) {
      vscode.window.showInformationMessage(
        `✅ Slack connection successful! (Using ${result.method})`
      );
    } else {
      vscode.window.showErrorMessage(
        `❌ Slack connection failed: ${result.error}`
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error testing Slack connection: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function sendToSlack(
  context: vscode.ExtensionContext,
  summary: string,
  commitCount: number
) {
  try {
    const config = vscode.workspace.getConfiguration("daily-standup-bot");
    const webhookUrl = await context.secrets.get("slack-webhook-url");
    const botToken = await context.secrets.get("slack-bot-token");

    if (!webhookUrl && !botToken) {
      const result = await vscode.window.showWarningMessage(
        "Slack not configured. Would you like to configure it now?",
        "Configure",
        "Cancel"
      );
      if (result === "Configure") {
        await configureSlack(context);
      }
      return;
    }

    const slackService = createSlackService({
      webhookUrl,
      botToken,
      defaultChannel: config.get<string>("slack.defaultChannel", "#general"),
      defaultUsername: config.get<string>("slack.botUsername", "AI Commit Bot"),
      defaultIcon: config.get<string>("slack.botIcon", ":robot_face:"),
    });

    vscode.window.showInformationMessage("Sending to Slack...");

    const success = await slackService.sendCommitSummary(summary, commitCount);

    if (success) {
      vscode.window.showInformationMessage("✅ Daily standup sent to Slack!");
    } else {
      vscode.window.showErrorMessage("❌ Failed to send message to Slack");
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error sending to Slack: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
