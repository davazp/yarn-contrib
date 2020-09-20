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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@yarnpkg/core");
const cli_1 = require("@yarnpkg/cli");
const fslib_1 = require("@yarnpkg/fslib");
const clipanion_1 = require("clipanion");
const util_1 = require("./util");
const ProductionInstallFetcher_1 = require("./ProductionInstallFetcher");
const ProductionInstallResolver_1 = require("./ProductionInstallResolver");
class ProdInstall extends clipanion_1.Command {
    constructor() {
        super(...arguments);
        this.json = false;
        this.silent = false;
    }
    async execute() {
        const configuration = await core_1.Configuration.find(this.context.cwd, this.context.plugins);
        const { project, workspace } = await core_1.Project.find(configuration, this.context.cwd);
        if (!workspace) {
            throw new cli_1.WorkspaceRequiredError(project.cwd, this.context.cwd);
        }
        const cache = await core_1.Cache.find(configuration, {
            immutable: true,
            check: false,
        });
        const rootDirectoryPath = project.topLevelWorkspace.cwd;
        const outDirectoryPath = fslib_1.ppath.isAbsolute(this.outDirectory)
            ? this.outDirectory
            : fslib_1.ppath.join(workspace.cwd, this.outDirectory);
        const report = await core_1.StreamReport.start({
            configuration,
            json: this.json,
            stdout: this.context.stdout,
            includeLogs: true,
        }, async (report) => {
            await report.startTimerPromise('Setting up production directory', async () => {
                await fslib_1.xfs.mkdirpPromise(outDirectoryPath);
                await util_1.copyFile(rootDirectoryPath, outDirectoryPath, configuration.get(`lockfileFilename`));
                await util_1.copyFile(rootDirectoryPath, outDirectoryPath, configuration.get(`rcFilename`));
                await util_1.copyFile(workspace.cwd, outDirectoryPath, fslib_1.toFilename('package.json'));
                const yarnExcludes = [];
                const checkConfigurationToExclude = (config) => {
                    try {
                        if (configuration.get(config)) {
                            yarnExcludes.push(configuration.get(config));
                        }
                    }
                    catch (_) {
                        // noop
                    }
                };
                checkConfigurationToExclude('bstatePath');
                checkConfigurationToExclude('installStatePath');
                checkConfigurationToExclude('cacheFolder');
                checkConfigurationToExclude('pnpUnpluggedFolder');
                checkConfigurationToExclude('deferredVersionFolder');
                await util_1.copyFolder(rootDirectoryPath, outDirectoryPath, `.yarn`, yarnExcludes);
            });
            await report.startTimerPromise('Modifying to contain only production dependencies', async () => {
                const packagePath = fslib_1.ppath.join(outDirectoryPath, fslib_1.toFilename('package.json'));
                const pak = (await fslib_1.xfs.readJsonPromise(packagePath));
                if (pak.devDependencies) {
                    delete pak.devDependencies;
                }
                await fslib_1.xfs.writeJsonPromise(packagePath, pak);
            });
            await report.startTimerPromise('Installing production version', async () => {
                const outConfiguration = await core_1.Configuration.find(outDirectoryPath, this.context.plugins);
                const { project: outProject, workspace: outWorkspace, } = await core_1.Project.find(outConfiguration, outDirectoryPath);
                if (!outWorkspace) {
                    throw new cli_1.WorkspaceRequiredError(project.cwd, this.context.cwd);
                }
                const outCache = await core_1.Cache.find(outConfiguration, {
                    immutable: false,
                    check: false,
                });
                const multiFetcher = configuration.makeFetcher();
                const multiResolver = configuration.makeResolver();
                const resolver = new ProductionInstallResolver_1.ProductionInstallResolver({
                    project,
                    resolver: multiResolver,
                });
                const fetcher = new ProductionInstallFetcher_1.ProductionInstallFetcher({
                    cache,
                    multiFetcher,
                    workspace,
                    project,
                    outConfiguration,
                    outDirectoryPath,
                });
                await outProject.install({
                    cache: outCache,
                    report,
                    immutable: false,
                    fetcher,
                    resolver,
                });
            });
        });
        return report.exitCode();
    }
}
ProdInstall.usage = clipanion_1.Command.Usage({
    description: 'INSTALL!',
    details: 'prod only install',
    examples: [
        [`Install the project with only prod dependencies`, `$0 prod-install`],
    ],
});
__decorate([
    clipanion_1.Command.String()
], ProdInstall.prototype, "outDirectory", void 0);
__decorate([
    clipanion_1.Command.Boolean(`--json`)
], ProdInstall.prototype, "json", void 0);
__decorate([
    clipanion_1.Command.Boolean(`--silent`, { hidden: true })
], ProdInstall.prototype, "silent", void 0);
__decorate([
    clipanion_1.Command.Path('prod-install')
], ProdInstall.prototype, "execute", null);
const plugin = { commands: [ProdInstall] };
exports.default = plugin;
