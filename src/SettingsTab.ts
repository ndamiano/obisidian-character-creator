import CharacterCreatorPlugin from "main";
import { App, PluginSettingTab, Setting, TFolder } from "obsidian";

export interface CharacterCreatorSettings {
	api_key: string;
	template: string;
	contextFolders: string[];
}

export const DEFAULT_SETTINGS: CharacterCreatorSettings = {
	api_key: "",
	template: "# {{Name}}\n\n**Description**: {{Description}}",
	contextFolders: [],
};

export class SettingsTab extends PluginSettingTab {
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
		containerEl.createEl("h3", { text: "Context Folders" });
		this.app.vault.getAllLoadedFiles().forEach((file) => {
			if (file instanceof TFolder) {
				const isChecked = this.plugin.settings.contextFolders.includes(
					file.path
				);

				new Setting(containerEl)
					.setName(file.path)
					.addToggle((toggle) =>
						toggle.setValue(isChecked).onChange(async (value) => {
							if (value) {
								this.plugin.settings.contextFolders.push(
									file.path
								);
							} else {
								this.plugin.settings.contextFolders.remove(
									file.path
								);
							}
							await this.plugin.saveSettings();
						})
					);
			}
		});
	}
}
