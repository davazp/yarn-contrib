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

import {
  Cache,
  Configuration,
  Fetcher,
  FetchOptions,
  FetchResult,
  formatUtils,
  Locator,
  MessageName,
  MinimalFetchOptions,
  miscUtils,
  Project,
  ReportError,
  StreamReport,
  structUtils,
  tgzUtils,
  WorkspaceResolver,
} from '@yarnpkg/core'
import {
  PortablePath,
  ppath,
  toFilename,
  xfs,
  ZipFS 
} from '@yarnpkg/fslib'
import {
  packUtils 
} from '@yarnpkg/plugin-pack'

export class ProductionInstallFetcher implements Fetcher {
  protected readonly fetcher: Fetcher
  protected readonly project: Project
  protected readonly cache: Cache

  constructor({
    fetcher,
    project,
    cache,
  }: {
    fetcher: Fetcher
    project: Project
    cache: Cache
  }) {
    this.fetcher = fetcher
    this.project = project
    this.cache = cache
  }

  supports(locator: Locator, opts: MinimalFetchOptions): boolean {
    return this.fetcher.supports(locator, opts)
  }

  getLocalPath(locator: Locator, opts: FetchOptions): PortablePath | null {
    if (
      locator.reference.startsWith(WorkspaceResolver.protocol) &&
      locator.reference !== `${WorkspaceResolver.protocol}.`
    ) {
      return null
    }
    else {
      return this.fetcher.getLocalPath(locator, opts)
    }
  }

  async fetch(locator: Locator, opts: FetchOptions): Promise<FetchResult> {
    const expectedChecksum = opts.checksums.get(locator.locatorHash) || null

    if (
      locator.reference.startsWith(WorkspaceResolver.protocol) &&
      locator.reference !== `${WorkspaceResolver.protocol}.`
    ) {
      const cache = await this.makeTemporaryCache(opts.cache)
      const [
        packageFs,
        releaseFs,
        checksum,
      ] = await cache.fetchPackageFromCache(locator, expectedChecksum, {
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
      cache.markedFiles.forEach((cachePath) =>
        opts.cache.markedFiles.add(cachePath),
      )
      return {
        packageFs,
        releaseFs,
        prefixPath: structUtils.getIdentVendorPath(locator),
        checksum: expectedChecksum ?? checksum,
      }
    }
    else if (locator.reference.startsWith('npm:')) {
      const cachePath = this.cache.getLocatorPath(locator, expectedChecksum)
      const outCachePath = opts.cache.getLocatorPath(locator, expectedChecksum)
      if (cachePath && (await xfs.existsPromise(cachePath))) {
        if (outCachePath && !(await xfs.existsPromise(outCachePath))) {
          try {
            await xfs.linkPromise(cachePath, outCachePath)
          }
          catch (e) {
            if (!(await xfs.existsPromise(outCachePath))) {
              opts.report.reportError(MessageName.FETCH_FAILED, e)
            }
          }
        }
      }
    }
    return this.fetcher.fetch(locator, opts)
  }

  async packWorkspace(
    locator: Locator,
    {
      report 
    }: FetchOptions,
  ): Promise<ZipFS> {
    const {
      configuration 
    } = this.project

    const workspace = this.project.getWorkspaceByLocator(locator)

    return xfs.mktempPromise(async (logDir) => {
      const workspacePretty = structUtils.slugifyLocator(locator)
      const logFile = ppath.join(
        logDir,
        toFilename(`${workspacePretty}-pack.log`),
      )

      const header = `# This file contains the result of Yarn calling packing "${workspacePretty}" ("${workspace.cwd}")\n`

      const {
        stdout, stderr 
      } = configuration.getSubprocessStreams(logFile, {
        report,
        prefix: structUtils.prettyLocator(
          configuration,
          workspace.anchoredLocator,
        ),
        header,
      })

      const packReport = await StreamReport.start(
        {
          configuration,
          stdout,
        },
        async () => {
          /** noop **/
        },
      )
      try {
        let buffer!: Buffer
        await packUtils.prepareForPack(
          workspace,
          { report: packReport },
          async () => {
            packReport.reportJson({ base: workspace.cwd })

            const files = await packUtils.genPackList(workspace)

            for (const file of files) {
              packReport.reportInfo(null, file)
              packReport.reportJson({ location: file })
            }

            const pack = await packUtils.genPackStream(workspace, files)
            buffer = await miscUtils.bufferStream(pack)
          },
        )

        return await tgzUtils.convertToZip(buffer, {
          stripComponents: 1,
          prefixPath: structUtils.getIdentVendorPath(locator),
        })
      }
      catch (e) {
        xfs.detachTemp(logDir)
        packReport.reportExceptionOnce(e)
        throw new ReportError(
          MessageName.LIFECYCLE_SCRIPT,
          `Packing ${workspacePretty} failed, logs can be found here: ${formatUtils.pretty(
            configuration,
            (logFile as unknown) as null,
            formatUtils.Type.PATH,
          )}); run ${formatUtils.pretty(
            configuration,
            `yarn ${ppath.relative(this.project.cwd, workspace.cwd)} pack`,
            formatUtils.Type.CODE,
          )} to investigate`,
        )
      }
      finally {
        await packReport.finalize()
        stdout.end()
        stderr.end()
      }
    })
  }

  async makeTemporaryCache(cache: Cache): Promise<Cache> {
    const {
      configuration: {
        startingCwd, plugins 
      },
      check,
      immutable,
      cwd,
    } = cache
    const configuration = Configuration.create(startingCwd, plugins)
    configuration.useWithSource(
      startingCwd,
      { enableMirror: false },
      startingCwd,
      { overwrite: true },
    )
    return new Cache(cwd, {
      configuration,
      check,
      immutable,
    })
  }
}
