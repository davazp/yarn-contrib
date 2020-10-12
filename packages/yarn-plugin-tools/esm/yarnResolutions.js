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
// imports
import { Configuration, Project, httpUtils, tgzUtils, structUtils, Cache, } from '@yarnpkg/core';
import { getPluginConfiguration } from '@yarnpkg/cli';
import { CwdFS, xfs, } from '@yarnpkg/fslib';
const yarnDownloadUrl = 'https://github.com/yarnpkg/berry/archive/master.tar.gz';
export async function genResolutions(project, report) {
    const sourceBuffer = await report.startTimerPromise('Downloading yarn repo archive', async () => {
        return await httpUtils.get(yarnDownloadUrl, { configuration: project.configuration });
    });
    return await xfs.mktempPromise(async (extractPath) => {
        var _a, _b, _c;
        const extractTarget = new CwdFS(extractPath);
        await report.startTimerPromise('Extracting yarn repo', async () => {
            await tgzUtils.extractArchiveTo(sourceBuffer, extractTarget, { stripComponents: 1 });
        });
        const configuration = await Configuration.find(extractPath, getPluginConfiguration(), {
            usePath: false,
            strict: false
        });
        const { project: yarnProject, } = await Project.find(configuration, extractPath);
        await yarnProject.restoreInstallState();
        const resolutions = new Map();
        for (const workspace of yarnProject.workspaces) {
            if (workspace.manifest.private) {
                continue;
            }
            resolutions.set(structUtils.stringifyIdent(workspace.locator), (_a = workspace.manifest.version) !== null && _a !== void 0 ? _a : '0.0.0');
            if (workspace.locator.name === 'core') {
                resolutions.set('clipanion', (_c = (_b = workspace.manifest.dependencies.get(structUtils.makeIdent(null, 'clipanion').identHash)) === null || _b === void 0 ? void 0 : _b.range) !== null && _c !== void 0 ? _c : '0.0.0');
            }
        }
        return resolutions;
    });
}
export async function updateProjectResolutions(project, resolutions, report) {
    const { manifest } = project.topLevelWorkspace;
    const rawManifest = manifest.exportTo({});
    if (!rawManifest.resolutions) {
        rawManifest.resolutions = {};
    }
    for (const [pkg, version] of resolutions.entries()) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        rawManifest.resolutions[pkg] = version;
    }
    manifest.load(rawManifest);
    await project.topLevelWorkspace.persistManifest();
    const cache = await Cache.find(project.configuration);
    await project.install({
        cache,
        report,
    });
}
