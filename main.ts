import { Menu, Notice, Plugin, TAbstractFile, TFile, TFolder } from "obsidian";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { CharacterSchema } from "src/CharacterSchema";
import {
	CharacterCreatorSettings,
	DEFAULT_SETTINGS,
	SettingsTab,
} from "src/SettingsTab";

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

		The following is the context you might want to use.


		`;

		const context = await this.buildContextBlob();

		const response = await this.client.responses.parse({
			model: "gpt-4o",
			instructions: prompt + context,
			input: "Generate a character.",
			text: {
				format: zodTextFormat(CharacterSchema, "character"),
			},
		});
		console.log(response);
		return response.output_parsed;
	}

	async buildContextBlob(): Promise<string> {
		let result = "";

		for (const folderPath of this.settings.contextFolders) {
			const folder = this.app.vault.getAbstractFileByPath(folderPath);
			if (!(folder instanceof TFolder)) continue;

			const mdFiles = getAllMarkdownFilesInFolder(folder);

			for (const file of mdFiles) {
				const content = await this.app.vault.read(file);
				result += `\n---\n# ${file.path}\n${content.trim()}\n`;
			}
		}

		// Optionally truncate to avoid token overflow (~12k tokens ≈ 50k characters)
		const maxLength = 10000;
		if (result.length > maxLength) {
			result = result.slice(-maxLength); // take the last part (most recent files)
			result = "...\n[Truncated]\n" + result;
		}

		return result;
	}
}

function getAllMarkdownFilesInFolder(folder: TFolder): TFile[] {
	const files: TFile[] = [];

	const walk = (current: TFolder) => {
		for (const item of current.children) {
			if (item instanceof TFolder) {
				walk(item); // recurse into subfolders
			} else if (item instanceof TFile && item.extension === "md") {
				files.push(item);
			}
		}
	};

	walk(folder);
	return files;
}
