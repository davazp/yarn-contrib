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
// Imports
const core_1 = require("@yarnpkg/core");
const prefixes = {
    pre: 'pre-',
    post: 'post-',
};
async function wrapScriptExecution(executor, project, locator, scriptName, extra) {
    const { configuration } = project;
    const userScriptLifecycleExcludes = configuration.get('userScriptLifecycleExcludes');
    const lifecycleScriptEnabled = !userScriptLifecycleExcludes.get(scriptName);
    return async () => {
        const workspaceByCwd = project.tryWorkspaceByLocator(locator);
        if (workspaceByCwd === null) {
            return executor();
        }
        const manifest = workspaceByCwd.manifest;
        const script = manifest.scripts.get(scriptName);
        if (typeof script === `undefined`) {
            return 1;
        }
        async function tryLifecycleScript(lifecycle) {
            const lifecycleScriptName = `${lifecycle}${scriptName}`;
            if (lifecycleScriptEnabled &&
                (await core_1.scriptUtils.hasPackageScript(locator, lifecycleScriptName, { project }))) {
                return await core_1.scriptUtils.executePackageScript(locator, lifecycleScriptName, [], {
                    cwd: extra.cwd,
                    project,
                    stdin: extra.stdin,
                    stdout: extra.stdout,
                    stderr: extra.stderr,
                });
            }
            else {
                return 0;
            }
        }
        if (!scriptName.startsWith(prefixes.pre)) {
            const pre = await tryLifecycleScript(prefixes.pre);
            if (pre !== 0) {
                return pre;
            }
        }
        const runMainScript = async () => {
            return await core_1.scriptUtils.executePackageShellcode(locator, script, extra.args, {
                cwd: extra.cwd,
                project,
                stdin: extra.stdin,
                stdout: extra.stdout,
                stderr: extra.stderr,
            });
        };
        const main = await runMainScript();
        if (main !== 0) {
            return main;
        }
        if (!scriptName.startsWith(prefixes.post)) {
            const post = await tryLifecycleScript(prefixes.post);
            if (post !== 0) {
                return post;
            }
        }
        return 0;
    };
}
const plugin = {
    hooks: { wrapScriptExecution },
    configuration: {
        userScriptLifecycleExcludes: {
            description: '',
            type: core_1.SettingsType.MAP,
            valueDefinition: {
                description: '',
                type: core_1.SettingsType.BOOLEAN,
            },
        },
    },
};
exports.default = plugin;
