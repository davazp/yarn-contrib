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
exports.run = void 0;
const tslib_1 = require("tslib");
// imports
const micromatch_1 = tslib_1.__importDefault(require("micromatch"));
const debug_1 = tslib_1.__importDefault(require("debug"));
const core_1 = require("@yarnpkg/core");
const cli_1 = require("@yarnpkg/cli");
const fslib_1 = require("@yarnpkg/fslib");
const parsers_1 = require("@yarnpkg/parsers");
const disabledPlugins = process.env.DISABLED_PLUGINS;
const debug = debug_1.default('@larry1123/yarn-plugin-tools:run-yarn');
async function run() {
    var _a, _b, _c;
    const cwd = process.cwd();
    const configuration = await core_1.Configuration.find(cwd, null, {
        strict: false,
        usePath: false,
    });
    const { project, workspace: rootWorkspace } = await core_1.Project.find(configuration, cwd);
    const yarnVersion = (_b = (_a = rootWorkspace === null || rootWorkspace === void 0 ? void 0 : rootWorkspace.manifest.resolutions.find((value) => parsers_1.stringifyResolution(value.pattern).endsWith('@yarnpkg/cli'))) === null || _a === void 0 ? void 0 : _a.reference) !== null && _b !== void 0 ? _b : '<unknown>';
    const pluginConfiguration = cli_1.getPluginConfiguration();
    for (const workspace of project.workspaces.filter((workspace) => {
        var _a;
        const workspaceName = workspace.locator.name;
        if (!workspaceName.startsWith('yarn-plugin')) {
            return false;
        }
        if ((disabledPlugins &&
            micromatch_1.default.match([workspaceName, workspaceName.replace(`yarn-plugin-`, ``)], disabledPlugins).length > 0) ||
            ((_a = workspace.manifest.raw) === null || _a === void 0 ? void 0 : _a.pluginEnabled) !== true) {
            debug(`${workspaceName} disabled`);
            return false;
        }
        return true;
    })) {
        const pluginName = core_1.structUtils.stringifyLocator(workspace.locator);
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const plugin = require(fslib_1.npath.fromPortablePath(workspace.cwd));
            const overrideName = `@yarnpkg/${workspace.locator.name.replace(/^yarn-/, '')}`;
            debug(`${pluginName} loaded as ${overrideName}`);
            pluginConfiguration.plugins.add(overrideName);
            pluginConfiguration.modules.set(overrideName, plugin);
        }
        catch (e) {
            debug(`${pluginName} disabled non-requirable: ${(_c = e) === null || _c === void 0 ? void 0 : _c.message}`);
        }
    }
    return cli_1.main({
        binaryVersion: yarnVersion,
        pluginConfiguration: pluginConfiguration,
    });
}
exports.run = run;
