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
const core_1 = require("@yarnpkg/core");
const fslib_1 = require("@yarnpkg/fslib");
const plugin_pack_1 = require("@yarnpkg/plugin-pack");
class ProductionInstallFetcher {
    constructor({ multiFetcher, project, workspace, cache, outDirectoryPath, outConfiguration, }) {
        this.multiFetcher = multiFetcher;
        this.project = project;
        this.workspace = workspace;
        this.cache = cache;
        this.outDirectoryPath = outDirectoryPath;
        this.outConfiguration = outConfiguration;
    }
    supports(locator, opts) {
        return this.multiFetcher.supports(locator, opts);
    }
    getLocalPath(locator, opts) {
        if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol) &&
            locator.reference !== `${core_1.WorkspaceResolver.protocol}.`) {
            return null;
        }
        else {
            return this.multiFetcher.getLocalPath(locator, opts);
        }
    }
    async fetch(locator, opts) {
        const expectedChecksum = opts.checksums.get(locator.locatorHash) || null;
        if (locator.reference.startsWith(core_1.WorkspaceResolver.protocol) &&
            locator.reference !== `${core_1.WorkspaceResolver.protocol}.`) {
            const [packageFs, releaseFs, checksum,] = await opts.cache.fetchPackageFromCache(locator, expectedChecksum, {
                onHit: () => opts.report.reportCacheHit(locator),
                onMiss: () => opts.report.reportCacheMiss(locator, `${core_1.structUtils.prettyLocator(opts.project.configuration, locator)} can't be found in the cache and will be packed from disk.`),
                loader: async () => this.packWorkspace(locator, opts),
                skipIntegrityCheck: opts.skipIntegrityCheck,
            });
            return {
                packageFs,
                releaseFs,
                prefixPath: core_1.structUtils.getIdentVendorPath(locator),
                checksum,
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
        return this.multiFetcher.fetch(locator, opts);
    }
    async packWorkspace(locator, { report }) {
        const workspace = this.project.getWorkspaceByLocator(locator);
        if (await plugin_pack_1.packUtils.hasPackScripts(workspace)) {
            try {
                const cache = await core_1.Cache.find(workspace.project.configuration, {
                    immutable: true,
                    check: false,
                });
                await workspace.project.install({
                    report,
                    cache,
                });
            }
            catch (_) {
                await workspace.project.resolveEverything({
                    lockfileOnly: true,
                    report,
                });
            }
        }
        let buffer;
        await plugin_pack_1.packUtils.prepareForPack(workspace, { report }, async () => {
            report.reportJson({ base: workspace.cwd });
            const files = await plugin_pack_1.packUtils.genPackList(workspace);
            for (const file of files) {
                report.reportInfo(null, file);
                report.reportJson({ location: file });
            }
            const pack = await plugin_pack_1.packUtils.genPackStream(workspace, files);
            buffer = await core_1.miscUtils.bufferStream(pack);
        });
        return await core_1.tgzUtils.convertToZip(buffer, {
            stripComponents: 1,
            prefixPath: core_1.structUtils.getIdentVendorPath(locator),
        });
    }
}
exports.ProductionInstallFetcher = ProductionInstallFetcher;
