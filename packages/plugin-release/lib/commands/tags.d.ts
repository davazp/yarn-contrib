import type { CommandContext } from '@yarnpkg/core';
import type { Usage } from 'clipanion';
import { Command } from 'clipanion';
export declare class ReleaseTags extends Command<CommandContext> {
    json: boolean;
    all: boolean;
    static usage: Usage;
    execute(): Promise<0 | 1>;
}
