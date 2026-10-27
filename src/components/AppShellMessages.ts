/** Presentation catalog for the app shell (header navigation groups, theme switch,
 * investigation toolbar disclosure). Kept local so the coordinator can fold it into
 * src/i18n/en.json at merge, like WedgeMessages.ts. English is the default. */
export type AppShellMessageCatalog=Readonly<{
 theme:Readonly<{legend:string;system:string;light:string;dark:string}>;
 navGroups:Readonly<{optical:string;radio:string;analysis:string;files:string;guides:string}>;
 backupHelpSummary:string;
 toolsMenu:string;
}>;

export const APP_SHELL_MESSAGES:AppShellMessageCatalog=Object.freeze({
 theme:Object.freeze({legend:'Color theme',system:'System',light:'Light',dark:'Dark'}),
 navGroups:Object.freeze({optical:'Optical observatory',radio:'Radio observatory',analysis:'Analysis',files:'Files',guides:'Exercise guides'}),
 backupHelpSummary:'What a backup includes',
 toolsMenu:'Tools',
});
