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
exports.ProductionInstallFetcher = void 0;
// imports
const core_1 = require("@yarnpkg/core");
const fslib_1 = require("@yarnpkg/fslib");
const plugin_pack_1 = require("@yarnpkg/plugin-pack");
class ProductionInstallFetcher {
    constructor({ fetcher, project, cache, }) {
        this.fetcher = fetcher;
        this.project = project;
        this.cache = cache;
    }
    supports(locator, opts) {
        return this.fetcher.supports(locator, opts);
    }
    getLocalPath(locator, opts) {
        if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol) &&
            locator.reference !== `${core_1.WorkspaceResolver.protocol}.`) {
            return null;
        }
        else {
            return this.fetcher.getLocalPath(locator, opts);
        }
    }
    async fetch(locator, opts) {
        const expectedChecksum = opts.checksums.get(locator.locatorHash) || null;
        if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol) &&
            locator.reference !== `${core_1.WorkspaceResolver.protocol}.`) {
            const cache = await this.makeTemporaryCache(opts.cache);
            const [packageFs, releaseFs, checksum,] = await cache.fetchPackageFromCache(locator, expectedChecksum, {
                onHit: () => opts.report.reportCacheHit(locator),
                onMiss: () => opts.report.reportCacheMiss(locator, `${core_1.structUtils.prettyLocator(opts.project.configuration, locator)} can't be found in the cache and will be packed from disk.`),
                loader: async () => this.packWorkspace(locator, opts),
                skipIntegrityCheck: opts.skipIntegrityCheck,
            });
            cache.markedFiles.forEach((cachePath) => opts.cache.markedFiles.add(cachePath));
            return {
                packageFs,
                releaseFs,
                prefixPath: core_1.structUtils.getIdentVendorPath(locator),
                checksum: expectedChecksum !== null && expectedChecksum !== void 0 ? expectedChecksum : checksum,
            };
        }
        else if (locator.reference.startsWith('npm:')) {
            const cachePath = this.cache.getLocatorPath(locator, expectedChecksum);
            const outCachePath = opts.cache.getLocatorPath(locator, expectedChecksum);
            if (cachePath && (await fslib_1.xfs.existsPromise(cachePath))) {
                if (outCachePath && !(await fslib_1.xfs.existsPromise(outCachePath))) {
                    try {
                        await fslib_1.xfs.linkPromise(cachePath, outCachePath);
                    }
                    catch (e) {
                        if (!(await fslib_1.xfs.existsPromise(outCachePath))) {
                            opts.report.reportError(core_1.MessageName.FETCH_FAILED, e);
                        }
                    }
                }
            }
        }
        return this.fetcher.fetch(locator, opts);
    }
    async packWorkspace(locator, { report }) {
        const { configuration } = this.project;
        const workspace = this.project.getWorkspaceByLocator(locator);
        return fslib_1.xfs.mktempPromise(async (logDir) => {
            const workspacePretty = core_1.structUtils.slugifyLocator(locator);
            const logFile = fslib_1.ppath.join(logDir, fslib_1.toFilename(`${workspacePretty}-pack.log`));
            const header = `# This file contains the result of Yarn calling packing "${workspacePretty}" ("${workspace.cwd}")\n`;
            const { stdout, stderr } = configuration.getSubprocessStreams(logFile, {
                report,
                prefix: core_1.structUtils.prettyLocator(configuration, workspace.anchoredLocator),
                header,
            });
            const packReport = await core_1.StreamReport.start({
                configuration,
                stdout,
            }, async () => {
                /** noop **/
            });
            try {
                let buffer;
                await plugin_pack_1.packUtils.prepareForPack(workspace, { report: packReport }, async () => {
                    packReport.reportJson({ base: workspace.cwd });
                    const files = await plugin_pack_1.packUtils.genPackList(workspace);
                    for (const file of files) {
                        packReport.reportInfo(null, file);
                        packReport.reportJson({ location: file });
                    }
                    const pack = await plugin_pack_1.packUtils.genPackStream(workspace, files);
                    buffer = await core_1.miscUtils.bufferStream(pack);
                });
                return await core_1.tgzUtils.convertToZip(buffer, {
                    stripComponents: 1,
                    prefixPath: core_1.structUtils.getIdentVendorPath(locator),
                });
            }
            catch (e) {
                fslib_1.xfs.detachTemp(logDir);
                packReport.reportExceptionOnce(e);
                throw new core_1.ReportError(core_1.MessageName.LIFECYCLE_SCRIPT, `Packing ${workspacePretty} failed, logs can be found here: ${core_1.formatUtils.pretty(configuration, logFile, core_1.formatUtils.Type.PATH)}); run ${core_1.formatUtils.pretty(configuration, `yarn ${fslib_1.ppath.relative(this.project.cwd, workspace.cwd)} pack`, core_1.formatUtils.Type.CODE)} to investigate`);
            }
            finally {
                await packReport.finalize();
                stdout.end();
                stderr.end();
            }
        });
    }
    async makeTemporaryCache(cache) {
        const { configuration: { startingCwd, plugins }, check, immutable, cwd, } = cache;
        const configuration = core_1.Configuration.create(startingCwd, plugins);
        configuration.useWithSource(startingCwd, { enableMirror: false }, startingCwd, { overwrite: true });
        return new core_1.Cache(cwd, {
            configuration,
            check,
            immutable,
        });
    }
}
exports.ProductionInstallFetcher = ProductionInstallFetcher;
