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

import fs from 'fs'

import {
  Cache,
  Configuration,
  Fetcher,
  FetchOptions,
  FetchResult,
  Locator,
  MessageName,
  MinimalFetchOptions,
  miscUtils,
  Project,
  structUtils,
  tgzUtils,
  Workspace,
  WorkspaceResolver,
} from '@yarnpkg/core'
import {
  npath, PortablePath, xfs, ZipFS 
} from '@yarnpkg/fslib'
import {
  packUtils 
} from '@yarnpkg/plugin-pack'

export class ProductionInstallFetcher implements Fetcher {
  protected readonly multiFetcher: Fetcher
  protected readonly project: Project
  protected readonly workspace: Workspace
  protected readonly cache: Cache
  protected readonly outConfiguration: Configuration
  protected readonly outDirectoryPath: PortablePath

  constructor({
    multiFetcher,
    project,
    workspace,
    cache,
    outDirectoryPath,
    outConfiguration,
  }: {
    multiFetcher: Fetcher
    project: Project
    workspace: Workspace
    cache: Cache
    outDirectoryPath: PortablePath
    outConfiguration: Configuration
  }) {
    this.multiFetcher = multiFetcher
    this.project = project
    this.workspace = workspace
    this.cache = cache
    this.outDirectoryPath = outDirectoryPath
    this.outConfiguration = outConfiguration
  }

  supports(locator: Locator, opts: MinimalFetchOptions): boolean {
    return this.multiFetcher.supports(locator, opts)
  }

  getLocalPath(locator: Locator, opts: FetchOptions): PortablePath | null {
    if (
      locator.reference.startsWith(WorkspaceResolver.protocol) &&
      locator.reference !== `${WorkspaceResolver.protocol}.`
    ) {
      return null
    }
    else {
      return this.multiFetcher.getLocalPath(locator, opts)
    }
  }

  async fetch(locator: Locator, opts: FetchOptions): Promise<FetchResult> {
    const expectedChecksum = opts.checksums.get(locator.locatorHash) || null

    if (
      locator.reference.startsWith(WorkspaceResolver.protocol) &&
      locator.reference !== `${WorkspaceResolver.protocol}.`
    ) {
      const [
        packageFs,
        releaseFs,
        checksum,
      ] = await opts.cache.fetchPackageFromCache(locator, expectedChecksum, {
        onHit: () => opts.report.reportCacheHit(locator),
        onMiss: () =>
          opts.report.reportCacheMiss(
            locator,
            `${structUtils.prettyLocator(
              opts.project.configuration,
              locator,
            )} can't be found in the cache and will be packed from disk.`,
          ),
        loader: async () => this.packWorkspace(locator, opts),
        skipIntegrityCheck: opts.skipIntegrityCheck,
      })

      return {
        packageFs,
        releaseFs,
        prefixPath: structUtils.getIdentVendorPath(locator),
        checksum,
      }
    }
    else if (locator.reference.startsWith('npm:')) {
      const cachePath = this.cache.getLocatorPath(locator, expectedChecksum)
      const outCachePath = opts.cache.getLocatorPath(locator, expectedChecksum)
      if (cachePath && (await xfs.existsPromise(cachePath))) {
        if (outCachePath && !(await xfs.existsPromise(outCachePath))) {
          try {
            fs.linkSync(
              npath.fromPortablePath(cachePath),
              npath.fromPortablePath(outCachePath),
            )
          }
          catch (e) {
            if (!(await xfs.existsPromise(outCachePath))) {
              opts.report.reportError(MessageName.FETCH_FAILED, e)
            }
          }
        }
      }
    }
    return this.multiFetcher.fetch(locator, opts)
  }

  async packWorkspace(
    locator: Locator,
    {
      report 
    }: FetchOptions,
  ): Promise<ZipFS> {
    const workspace = this.project.getWorkspaceByLocator(locator)
    if (await packUtils.hasPackScripts(workspace)) {
      try {
        const cache = await Cache.find(workspace.project.configuration, {
          immutable: true,
          check: false,
        })
        await workspace.project.install({
          report,
          cache,
        })
      }
      catch (_) {
        await workspace.project.resolveEverything({
          lockfileOnly: true,
          report,
        })
      }
    }

    let buffer!: Buffer
    await packUtils.prepareForPack(workspace, { report }, async () => {
      report.reportJson({ base: workspace.cwd })

      const files = await packUtils.genPackList(workspace)

      for (const file of files) {
        report.reportInfo(null, file)
        report.reportJson({ location: file })
      }

      const pack = await packUtils.genPackStream(workspace, files)
      buffer = await miscUtils.bufferStream(pack)
    })

    return await tgzUtils.convertToZip(buffer, {
      stripComponents: 1,
      prefixPath: structUtils.getIdentVendorPath(locator),
    })
  }
}
