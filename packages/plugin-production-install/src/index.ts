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

// types

import type {
  Plugin,
  Hooks,
  CommandContext,
  Package,
  ConfigurationValueMap,
  ResolveOptions,
  Resolver,
} from '@yarnpkg/core'
import type {
  // ok so this is not exported by the index FUN!
  PackageExtension,
} from '@yarnpkg/core/lib/Configuration'
import type {
  PortablePath 
} from '@yarnpkg/fslib'
import type {
  Usage 
} from 'clipanion'

// imports

import {
  Cache,
  Configuration,
  Project,
  StreamReport,
  MessageName,
} from '@yarnpkg/core'
import {
  MultiResolver 
} from '@yarnpkg/core/lib/MultiResolver'
import {
  LockfileResolver 
} from '@yarnpkg/core/lib/LockfileResolver'
import {
  WorkspaceRequiredError 
} from '@yarnpkg/cli'
import {
  ppath,
  toFilename,
  xfs 
} from '@yarnpkg/fslib'
import {
  patchUtils 
} from '@yarnpkg/plugin-patch'
import {
  packUtils 
} from '@yarnpkg/plugin-pack'
import {
  Command 
} from 'clipanion'

import {
  dependenciesUtils 
} from '@larry1123/yarn-utils'

import {
  copyFile,
  copyFolder 
} from './util'
import {
  ProductionInstallFetcher 
} from './ProductionInstallFetcher'
import {
  ProductionInstallResolver 
} from './ProductionInstallResolver'

type KeysMatching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never
}[keyof T]

const ManifestFile = toFilename('package.json')

class ProdInstall extends Command<CommandContext> {
  @Command.String()
  outDirectory!: string

  @Command.Boolean(`--json`)
  json = false

  @Command.Boolean(`--no-strip-types`)
  noStripTypes = false

  @Command.Boolean(`--pack`)
  pack = false

  @Command.Boolean(`--silent`, { hidden: true })
  silent?: boolean = false

  static usage: Usage = Command.Usage({
    description: 'INSTALL!',
    details: 'prod only install',
    examples: [
      [`Install the project with only prod dependencies`, `$0 prod-install`],
    ],
  })

  @Command.Path('prod-install')
  async execute(): Promise<0 | 1> {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins,
    )
    const {
      project, workspace 
    } = await Project.find(
      configuration,
      this.context.cwd,
    )

    await project.restoreInstallState()

    if (!workspace) {
      throw new WorkspaceRequiredError(project.cwd, this.context.cwd)
    }
    const cache = await Cache.find(configuration, {
      immutable: true,
      check: false,
    })

    const rootDirectoryPath = project.topLevelWorkspace.cwd
    const outDirectoryPath: PortablePath = ppath.isAbsolute(
      this.outDirectory as PortablePath,
    )
      ? (this.outDirectory as PortablePath)
      : ppath.join(workspace.cwd, this.outDirectory as PortablePath)

    const report = await StreamReport.start(
      {
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      },
      async (report: StreamReport) => {
        await report.startTimerPromise(
          'Setting up production directory',
          async () => {
            await xfs.mkdirpPromise(outDirectoryPath)
            await copyFile(
              rootDirectoryPath,
              outDirectoryPath,
              configuration.get(`lockfileFilename`),
            )
            await copyFile(
              rootDirectoryPath,
              outDirectoryPath,
              configuration.get(`rcFilename`),
            )
            await copyFile(workspace.cwd, outDirectoryPath, ManifestFile)
            const yarnExcludes: Array<PortablePath> = []
            const checkConfigurationToExclude = <
              K extends KeysMatching<ConfigurationValueMap, PortablePath>
            >(
              config: K,
            ): void => {
              try {
                if (configuration.get(config)) {
                  yarnExcludes.push(configuration.get(config))
                }
              }
              catch (_) {
                // noop
              }
            }
            checkConfigurationToExclude('bstatePath')
            checkConfigurationToExclude('installStatePath')
            checkConfigurationToExclude('cacheFolder')
            checkConfigurationToExclude('deferredVersionFolder')

            await configuration.triggerHook(
              (hooks: Hooks) => {
                return hooks.populateYarnPaths
              },
              project,
              (path: PortablePath | null) => {
                if (path) {
                  yarnExcludes.push(path)
                }
              },
            )

            await copyFolder(
              rootDirectoryPath,
              outDirectoryPath,
              `.yarn` as PortablePath,
              yarnExcludes,
            )
          },
        )

        await report.startTimerPromise(
          'Installing production version',
          async () => {
            const outConfiguration = await Configuration.find(
              outDirectoryPath,
              this.context.plugins,
            )

            if (!this.noStripTypes) {
              for (const [
                ident,
                extensionsByIdent,
              ] of outConfiguration.packageExtensions.entries()) {
                const identExt: Array<[string, Array<PackageExtension>]> = []
                for (const [range, extensionsByRange] of extensionsByIdent) {
                  identExt.push([
                    range,
                    extensionsByRange.filter(
                      (extension: PackageExtension) =>
                        // TODO solve without ts-ignore
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        extension?.descriptor?.scope !== 'types',
                    ),
                  ])
                }
                outConfiguration.packageExtensions.set(ident, identExt)
              }
            }

            const {
              project: outProject,
              workspace: outWorkspace,
            } = await Project.find(outConfiguration, outDirectoryPath)
            if (!outWorkspace) {
              throw new WorkspaceRequiredError(project.cwd, this.context.cwd)
            }

            outWorkspace.manifest.devDependencies.clear()

            const outCache = await Cache.find(outConfiguration, {
              immutable: false,
              check: false,
            })

            const multiFetcher = configuration.makeFetcher()
            const multiResolver = new MultiResolver([
              new LockfileResolver(),
              configuration.makeResolver(),
            ])

            const resolver = new ProductionInstallResolver({
              project,
              resolver: multiResolver,
              stripTypes: !this.noStripTypes,
            })

            const fetcher = new ProductionInstallFetcher({
              cache,
              fetcher: multiFetcher,
              project,
            })

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
            })

            await outProject.install({
              cache: outCache,
              report,
              immutable: false,
              fetcher,
              resolver,
            })

            await report.startTimerPromise(
              'Cleaning up unused dependencies',
              async () => {
                const toRemove: Array<PortablePath> = []

                toRemove.push(
                  ...(await this.getPatchSourcesToRemove(outProject, outCache)),
                )

                for (const locatorPath of toRemove) {
                  if (await xfs.existsPromise(locatorPath)) {
                    report.reportInfo(
                      MessageName.UNUSED_CACHE_ENTRY,
                      `${ppath.basename(
                        locatorPath,
                      )} appears to be unused - removing`,
                    )
                    await xfs.removePromise(locatorPath)
                  }
                }
              },
            )
          },
        )

        if (this.pack) {
          await report.startTimerPromise('Packing workspace ', async () => {
            await packUtils.prepareForPack(workspace, { report }, async () => {
              report.reportJson({ base: workspace.cwd })

              const files = await packUtils.genPackList(workspace)

              for (const file of files) {
                report.reportInfo(null, file)
                report.reportJson({ location: file })
                if (file.endsWith(ManifestFile)) {
                  const manifest = await packUtils.genPackageManifest(workspace)
                  await xfs.writeJsonPromise(
                    ppath.resolve(outDirectoryPath, file),
                    manifest,
                  )
                }
                else {
                  await copyFile(workspace.cwd, outDirectoryPath, file)
                }
              }
            })
          })
        }
      },
    )

    return report.exitCode()
  }

  private async getPatchSourcesToRemove(
    project: Project,
    cache: Cache,
  ): Promise<Array<PortablePath>> {
    const patchedPackages: Array<Package> = []
    project.storedPackages.forEach((storedPackage) => {
      if (storedPackage.reference.startsWith('patch:')) {
        patchedPackages.push(storedPackage)
      }
    })
    const toRemove: Array<PortablePath> = []
    for (const patchedPackage of patchedPackages) {
      const {
        sourceLocator 
      } = patchUtils.parseLocator(patchedPackage)
      const sourcePackage = project.storedPackages.get(
        sourceLocator.locatorHash,
      )
      if (!sourcePackage) {
        // This should be an error but currently not going to throw
        break
      }
      const dependencies = await dependenciesUtils.getDependents(
        project,
        sourcePackage,
      )
      if (
        dependencies.filter(
          (pkg) => pkg.locatorHash !== patchedPackage.locatorHash,
        ).length > 0
      ) {
        const locatorPath = cache.getLocatorPath(
          sourceLocator,
          project.storedChecksums.get(sourceLocator.locatorHash) ?? null,
        )
        if (locatorPath) {
          toRemove.push(locatorPath)
        }
      }
    }
    return toRemove
  }

  private async modifyOriginalResolutions(
    project: Project,
    resolver: Resolver,
    opts: ResolveOptions,
  ) {
    await opts.report.startTimerPromise(
      'Modifying original install state',
      async () => {
        for (const [
          locatorHash,
          originalPackage,
        ] of project.originalPackages.entries()) {
          const resolvedPackage = await resolver.resolve(originalPackage, opts)
          project.originalPackages.set(locatorHash, resolvedPackage)
        }
      },
    )
  }
}

const plugin: Plugin = { commands: [ProdInstall] }

export default plugin
