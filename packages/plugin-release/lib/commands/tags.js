"use strict";
/*
 * Copyright 2020 Larry1123
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReleaseTags = void 0;
const tslib_1 = require("tslib");
// imports
const core_1 = require("@yarnpkg/core");
const cli_1 = require("@yarnpkg/cli");
const versionUtils_1 = tslib_1.__importDefault(require("@yarnpkg/plugin-version/lib/versionUtils"));
const clipanion_1 = require("clipanion");
class ReleaseTags extends clipanion_1.Command {
    constructor() {
        super(...arguments);
        this.json = false;
        this.all = false;
    }
    async execute() {
        const configuration = await core_1.Configuration.find(this.context.cwd, this.context.plugins);
        const { project, workspace } = await core_1.Project.find(configuration, this.context.cwd);
        if (!workspace) {
            throw new cli_1.WorkspaceRequiredError(project.cwd, this.context.cwd);
        }
        const releases = await versionUtils_1.default.resolveVersionFiles(project);
        console.dir(releases);
        return 0;
    }
}
ReleaseTags.usage = clipanion_1.Command.Usage({
    description: '',
    details: '',
    examples: [[``, ``]],
});
tslib_1.__decorate([
    clipanion_1.Command.Boolean(`--json`)
], ReleaseTags.prototype, "json", void 0);
tslib_1.__decorate([
    clipanion_1.Command.Boolean(`--all`, { description: `Apply the deferred version changes on all workspaces` })
], ReleaseTags.prototype, "all", void 0);
tslib_1.__decorate([
    clipanion_1.Command.Path('release', 'tags')
], ReleaseTags.prototype, "execute", null);
exports.ReleaseTags = ReleaseTags;
