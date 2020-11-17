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
exports.updateInstall = exports.updateProjectResolutions = exports.genResolutions = exports.readyYarnProject = exports.downloadAndExtractYarn = exports.downloadYarnRepo = void 0;
// imports
const core_1 = require("@yarnpkg/core");
const cli_1 = require("@yarnpkg/cli");
const parsers_1 = require("@yarnpkg/parsers");
const fslib_1 = require("@yarnpkg/fslib");
const yarnDownloadUrl = 'https://github.com/yarnpkg/berry/archive/master.tar.gz';
async function downloadYarnRepo(project, report) {
    return await report.startTimerPromise('Downloading yarn repo archive', async () => {
        return (await core_1.httpUtils.get(yarnDownloadUrl, { configuration: project.configuration }));
    });
}
exports.downloadYarnRepo = downloadYarnRepo;
async function downloadAndExtractYarn(project, extractPath, report) {
    const sourceBuffer = await downloadYarnRepo(project, report);
    const extractTarget = new fslib_1.CwdFS(extractPath);
    await report.startTimerPromise('Extracting yarn repo', async () => {
        await core_1.tgzUtils.extractArchiveTo(sourceBuffer, extractTarget, { stripComponents: 1 });
    });
}
exports.downloadAndExtractYarn = downloadAndExtractYarn;
async function readyYarnProject(yarnPath, report) {
    report.reportInfo(null, 'Readying yarn project');
    const configuration = await core_1.Configuration.find(yarnPath, cli_1.getPluginConfiguration(), {
        usePath: false,
        strict: false,
    });
    const { project: yarnProject } = await core_1.Project.find(configuration, yarnPath);
    await yarnProject.restoreInstallState();
    return yarnProject;
}
exports.readyYarnProject = readyYarnProject;
async function genResolutions(yarnProject, report) {
    var _a, _b, _c;
    report.reportInfo(null, 'Getting yarn workspaces versions.');
    const resolutions = new Map();
    for (const workspace of yarnProject.workspaces) {
        if (workspace.manifest.private) {
            continue;
        }
        resolutions.set(core_1.structUtils.stringifyIdent(workspace.locator), (_a = workspace.manifest.version) !== null && _a !== void 0 ? _a : '0.0.0');
        if (workspace.locator.name === 'core') {
            resolutions.set('clipanion', (_c = (_b = workspace.manifest.dependencies.get(core_1.structUtils.makeIdent(null, 'clipanion').identHash)) === null || _b === void 0 ? void 0 : _b.range) !== null && _c !== void 0 ? _c : '0.0.0');
        }
    }
    return resolutions;
}
exports.genResolutions = genResolutions;
async function updateProjectResolutions(project, resolutions, report) {
    const { manifest } = project.topLevelWorkspace;
    for (const [pkg, version] of resolutions.entries()) {
        manifest.resolutions.push({
            pattern: parsers_1.parseResolution(pkg),
            reference: version,
        });
    }
    report.reportInfo(null, 'Persisting Manifest');
    await project.topLevelWorkspace.persistManifest();
}
exports.updateProjectResolutions = updateProjectResolutions;
async function updateInstall(project, report) {
    report.reportInfo(null, 'Running install to update project');
    const passThrough = report.createStreamReporter();
    await core_1.execUtils.pipevp('yarn', ['install'], {
        cwd: project.cwd,
        stdin: null,
        stdout: passThrough,
        stderr: passThrough,
    });
    passThrough.destroy();
}
exports.updateInstall = updateInstall;
