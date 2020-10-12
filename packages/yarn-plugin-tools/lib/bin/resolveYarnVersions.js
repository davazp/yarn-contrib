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
// imports
const core_1 = require("@yarnpkg/core");
const fslib_1 = require("@yarnpkg/fslib");
const cli_1 = require("@yarnpkg/cli");
const yarnResolutions_1 = require("../yarnResolutions");
async function main() {
    const cwd = fslib_1.npath.toPortablePath(process.cwd());
    const configuration = await core_1.Configuration.find(cwd, cli_1.getPluginConfiguration(), { strict: false });
    const { project } = await core_1.Project.find(configuration, cwd);
    const report = new core_1.StreamReport({
        configuration,
        stdout: process.stdout,
    });
    const resolutions = await yarnResolutions_1.genResolutions(project, report);
    await yarnResolutions_1.updateProjectResolutions(project, resolutions, report);
    await report.finalize();
    return report.exitCode();
}
main()
    .then((exitCode) => {
    process.exit(exitCode);
})
    .catch(console.error.bind(console));
