import {
	App,
	Menu,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFolder,
} from "obsidian";

import { CharacterSchema } from "CharacterSchema";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

// Remember to rename these classes and interfaces!

interface CharacterCreatorSettings {
	api_key: string;
	template: string;
}

const DEFAULT_SETTINGS: CharacterCreatorSettings = {
	api_key: "",
	template: "# {{Name}}\n\n**Description**: {{Description}}",
};

export default class CharacterCreatorPlugin extends Plugin {
	settings: CharacterCreatorSettings;

	client: OpenAI;

	async onload() {
		await this.loadSettings();
		this.client = new OpenAI({
			apiKey: this.settings.api_key,
			dangerouslyAllowBrowser: true,
		});

		this.registerEvent(
			this.app.workspace.on(
				"file-menu",
				(menu: Menu, file: TAbstractFile) => {
					if (file instanceof TFolder) {
						menu.addItem((item) =>
							item
								.setTitle("Generate Character Here")
								.setIcon("dice")
								.onClick(() => this.createCharacter(file))
						);
					}
				}
			)
		);

		this.addSettingTab(new SettingsTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async createCharacter(targetFolder: TFolder) {
		new Notice("Creating a chracter for you.");
		const result = await this.generateCharacter();
		try {
			if (!result) {
				new Notice("ChatGPT failed to generate a character for you.");
				return;
			}
			const fileName = `${result.name}.md`;
			const filePath = `${targetFolder.path}/${fileName}`;
			const content = result.description;
			await this.app.vault.create(filePath, content);
			new Notice(
				`Character ${result.name} created in "${targetFolder.path}"`
			);
		} catch (err) {
			console.error("Failed to create character note", err);
			new Notice("Error creating character note.");
		}
	}

	async generateCharacter() {
		const prompt = `You are an AI that generates fantasy characters for roleplaying games. Return only JSON.

		Example format:
		{
		"Name": "Zariah Thornroot",
		"Description": "A cunning herbalist who trades in secrets as often as roots."
		}

		Generate one character now:
		`;

		const response = await this.client.responses.parse({
			model: "gpt-4o",
			instructions:
				"You are an AI that generates fantasy characters for roleplaying games.",
			input: "Generate a character.",
			text: {
				format: zodTextFormat(CharacterSchema, "character"),
			},
		});
		console.log(response);
		return response.output_parsed;
	}
}

class SettingsTab extends PluginSettingTab {
	plugin: CharacterCreatorPlugin;

	constructor(app: App, plugin: CharacterCreatorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Chat GPT API Key")
			.setDesc("In order to get this go here: ")
			.addText((text) =>
				text
					.setPlaceholder("This is your API key for chatGPT")
					.setValue(this.plugin.settings.api_key)
					.onChange(async (value) => {
						this.plugin.settings.api_key = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Character Template")
			.setDesc("Use {{Name}} and {{Description}} in your template.")
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.template)
					.onChange(async (value) => {
						this.plugin.settings.template = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
