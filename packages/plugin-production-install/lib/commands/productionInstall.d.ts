import type { CommandContext } from '@yarnpkg/core';
import type { Usage } from 'clipanion';
import { Command } from 'clipanion';
export declare class ProdInstall extends Command<CommandContext> {
    outDirectory: string;
    json: boolean;
    noStripTypes: boolean;
    pack: boolean;
    silent?: boolean;
    static usage: Usage;
    execute(): Promise<0 | 1>;
    private getPatchSourcesToRemove;
    private modifyOriginalResolutions;
}
