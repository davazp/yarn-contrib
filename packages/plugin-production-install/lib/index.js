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
const tslib_1 = require("tslib");
// imports
const core_1 = require("@yarnpkg/core");
const MultiResolver_1 = require("@yarnpkg/core/lib/MultiResolver");
const LockfileResolver_1 = require("@yarnpkg/core/lib/LockfileResolver");
const cli_1 = require("@yarnpkg/cli");
const fslib_1 = require("@yarnpkg/fslib");
const plugin_patch_1 = require("@yarnpkg/plugin-patch");
const plugin_pack_1 = require("@yarnpkg/plugin-pack");
const clipanion_1 = require("clipanion");
const yarn_utils_1 = require("@larry1123/yarn-utils");
const util_1 = require("./util");
const ProductionInstallFetcher_1 = require("./ProductionInstallFetcher");
const ProductionInstallResolver_1 = require("./ProductionInstallResolver");
const ManifestFile = fslib_1.toFilename('package.json');
class ProdInstall extends clipanion_1.Command {
    constructor() {
        super(...arguments);
        this.json = false;
        this.stripTypes = true;
        this.pack = false;
        this.silent = false;
    }
    async execute() {
        const configuration = await core_1.Configuration.find(this.context.cwd, this.context.plugins);
        const { project, workspace } = await core_1.Project.find(configuration, this.context.cwd);
        await project.restoreInstallState();
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
        }, async (report) => {
            await report.startTimerPromise('Setting up production directory', async () => {
                await fslib_1.xfs.mkdirpPromise(outDirectoryPath);
                await util_1.copyFile(rootDirectoryPath, outDirectoryPath, configuration.get(`lockfileFilename`));
                await util_1.copyFile(rootDirectoryPath, outDirectoryPath, configuration.get(`rcFilename`));
                await util_1.copyFile(workspace.cwd, outDirectoryPath, ManifestFile);
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
            await report.startTimerPromise('Installing production version', async () => {
                const outConfiguration = await core_1.Configuration.find(outDirectoryPath, this.context.plugins);
                if (this.stripTypes) {
                    for (const [ident, extensionsByIdent,] of outConfiguration.packageExtensions.entries()) {
                        const identExt = [];
                        for (const [range, extensionsByRange] of extensionsByIdent) {
                            identExt.push([
                                range,
                                extensionsByRange.filter((extension) => { var _a; 
                                // TODO solve without ts-ignore
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                return ((_a = extension === null || extension === void 0 ? void 0 : extension.descriptor) === null || _a === void 0 ? void 0 : _a.scope) !== 'types'; }),
                            ]);
                        }
                        outConfiguration.packageExtensions.set(ident, identExt);
                    }
                }
                const { project: outProject, workspace: outWorkspace, } = await core_1.Project.find(outConfiguration, outDirectoryPath);
                if (!outWorkspace) {
                    throw new cli_1.WorkspaceRequiredError(project.cwd, this.context.cwd);
                }
                outWorkspace.manifest.devDependencies.clear();
                const outCache = await core_1.Cache.find(outConfiguration, {
                    immutable: false,
                    check: false,
                });
                const multiFetcher = configuration.makeFetcher();
                const multiResolver = new MultiResolver_1.MultiResolver([
                    new LockfileResolver_1.LockfileResolver(),
                    configuration.makeResolver(),
                ]);
                const resolver = new ProductionInstallResolver_1.ProductionInstallResolver({
                    project,
                    resolver: multiResolver,
                    stripTypes: this.stripTypes,
                });
                const fetcher = new ProductionInstallFetcher_1.ProductionInstallFetcher({
                    cache,
                    fetcher: multiFetcher,
                    project,
                });
                await this.modifyOriginalResolutions(outProject, resolver, {
                    project: outProject,
                    fetchOptions: {
                        cache: outCache,
                        project: outProject,
                        fetcher,
                        checksums: outProject.storedChecksums,
                        report,
                    },
                    resolver,
                    report,
                });
                await outProject.install({
                    cache: outCache,
                    report,
                    immutable: false,
                    fetcher,
                    resolver,
                });
                await report.startTimerPromise('Cleaning up unused dependencies', async () => {
                    const toRemove = [];
                    toRemove.push(...(await this.getPatchSourcesToRemove(outProject, outCache)));
                    for (const locatorPath of toRemove) {
                        if (await fslib_1.xfs.existsPromise(locatorPath)) {
                            report.reportInfo(core_1.MessageName.UNUSED_CACHE_ENTRY, `${fslib_1.ppath.basename(locatorPath)} appears to be unused - removing`);
                            await fslib_1.xfs.removePromise(locatorPath);
                        }
                    }
                });
            });
            if (this.pack) {
                await report.startTimerPromise('Packing workspace ', async () => {
                    await plugin_pack_1.packUtils.prepareForPack(workspace, { report }, async () => {
                        report.reportJson({ base: workspace.cwd });
                        const files = await plugin_pack_1.packUtils.genPackList(workspace);
                        for (const file of files) {
                            report.reportInfo(null, file);
                            report.reportJson({ location: file });
                            if (file.endsWith(ManifestFile)) {
                                const manifest = await plugin_pack_1.packUtils.genPackageManifest(workspace);
                                await fslib_1.xfs.writeJsonPromise(fslib_1.ppath.resolve(outDirectoryPath, file), manifest);
                            }
                            else {
                                await util_1.copyFile(workspace.cwd, outDirectoryPath, file);
                            }
                        }
                    });
                });
            }
        });
        return report.exitCode();
    }
    async getPatchSourcesToRemove(project, cache) {
        var _a;
        const patchedPackages = [];
        project.storedPackages.forEach((storedPackage) => {
            if (storedPackage.reference.startsWith('patch:')) {
                patchedPackages.push(storedPackage);
            }
        });
        const toRemove = [];
        for (const patchedPackage of patchedPackages) {
            const { sourceLocator } = plugin_patch_1.patchUtils.parseLocator(patchedPackage);
            const sourcePackage = project.storedPackages.get(sourceLocator.locatorHash);
            if (!sourcePackage) {
                // This should be an error but currently not going to throw
                break;
            }
            const dependencies = await yarn_utils_1.dependenciesUtils.getDependents(project, sourcePackage);
            if (dependencies.filter((pkg) => pkg.locatorHash !== patchedPackage.locatorHash).length > 0) {
                const locatorPath = cache.getLocatorPath(sourceLocator, (_a = project.storedChecksums.get(sourceLocator.locatorHash)) !== null && _a !== void 0 ? _a : null);
                if (locatorPath) {
                    toRemove.push(locatorPath);
                }
            }
        }
        return toRemove;
    }
    async modifyOriginalResolutions(project, resolver, opts) {
        await opts.report.startTimerPromise('Modifying original install state', async () => {
            for (const [locatorHash, originalPackage,] of project.originalPackages.entries()) {
                const resolvedPackage = await resolver.resolve(originalPackage, opts);
                project.originalPackages.set(locatorHash, resolvedPackage);
            }
        });
    }
}
ProdInstall.usage = clipanion_1.Command.Usage({
    description: 'INSTALL!',
    details: 'prod only install',
    examples: [
        [`Install the project with only prod dependencies`, `$0 prod-install`],
    ],
});
tslib_1.__decorate([
    clipanion_1.Command.String()
], ProdInstall.prototype, "outDirectory", void 0);
tslib_1.__decorate([
    clipanion_1.Command.Boolean(`--json`)
], ProdInstall.prototype, "json", void 0);
tslib_1.__decorate([
    clipanion_1.Command.Boolean(`--strip-types`)
], ProdInstall.prototype, "stripTypes", void 0);
tslib_1.__decorate([
    clipanion_1.Command.Boolean(`--pack`)
], ProdInstall.prototype, "pack", void 0);
tslib_1.__decorate([
    clipanion_1.Command.Boolean(`--silent`, { hidden: true })
], ProdInstall.prototype, "silent", void 0);
tslib_1.__decorate([
    clipanion_1.Command.Path('prod-install')
], ProdInstall.prototype, "execute", null);
const plugin = { commands: [ProdInstall] };
exports.default = plugin;
