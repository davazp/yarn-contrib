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
  Plugin,
  Project,
  StreamReport,
  CommandContext,
  Package,
  Locator,
  MessageName,
} from '@yarnpkg/core'
import {
  WorkspaceRequiredError 
} from '@yarnpkg/cli'
import {
  PortablePath,
  ppath,
  toFilename,
  xfs 
} from '@yarnpkg/fslib'
import {
  patchUtils
} from '@yarnpkg/plugin-patch'
import {
  Command,
  Usage 
} from 'clipanion'

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

class ProdInstall extends Command<CommandContext> {
  @Command.String()
  outDirectory!: string

  @Command.Boolean(`--json`)
  json = false

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
        includeLogs: true,
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
            await copyFile(
              workspace.cwd,
              outDirectoryPath,
              toFilename('package.json'),
            )
            const yarnExcludes: Array<PortablePath> = []
            const checkConfigurationToExclude = (config: string) => {
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
            checkConfigurationToExclude('pnpUnpluggedFolder')
            checkConfigurationToExclude('deferredVersionFolder')
            await copyFolder(
              rootDirectoryPath,
              outDirectoryPath,
              `.yarn` as PortablePath,
              yarnExcludes,
            )
          },
        )

        await report.startTimerPromise(
          'Modifying to contain only production dependencies',
          async () => {
            const workspacePackagePath = ppath.join(
              outDirectoryPath,
              toFilename('package.json'),
            )
            const rootPackagePath = ppath.join(
              rootDirectoryPath,
              toFilename('package.json'),
            )
            const workspacePackage = (await xfs.readJsonPromise(
              workspacePackagePath,
            )) as {
              devDependencies: unknown
              resolutions: unknown
            }
            const rootPackage = (await xfs.readJsonPromise(
              rootPackagePath,
            )) as {
              resolutions: unknown
            }
            if (workspacePackage.devDependencies) {
              delete workspacePackage.devDependencies
            }
            if (rootPackage.resolutions) {
              workspacePackage.resolutions = rootPackage.resolutions
            }
            await xfs.writeJsonPromise(workspacePackagePath, workspacePackage)
          },
        )

        await report.startTimerPromise(
          'Installing production version',
          async () => {
            const outConfiguration = await Configuration.find(
              outDirectoryPath,
              this.context.plugins,
            )
            const {
              project: outProject,
              workspace: outWorkspace,
            } = await Project.find(outConfiguration, outDirectoryPath)
            if (!outWorkspace) {
              throw new WorkspaceRequiredError(project.cwd, this.context.cwd)
            }
            const outCache = await Cache.find(outConfiguration, {
              immutable: false,
              check: false,
            })

            const multiFetcher = configuration.makeFetcher()
            const multiResolver = configuration.makeResolver()

            const resolver = new ProductionInstallResolver({
              project,
              resolver: multiResolver,
            })

            const fetcher = new ProductionInstallFetcher({
              cache,
              multiFetcher,
              workspace,
              project,
              outConfiguration,
              outDirectoryPath,
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
                const toRemove = this.cleanUpPatchSources(outProject, outCache)
                for (const locatorPath of toRemove) {
                  report.reportInfo(
                    MessageName.UNUSED_CACHE_ENTRY,
                    `${ppath.basename(
                      locatorPath,
                    )} appears to be unused - removing`,
                  )
                  xfs.removeSync(locatorPath)
                }
              },
            )
          },
        )
      },
    )
    return report.exitCode()
  }

  private cleanUpPatchSources(
    project: Project,
    cache: Cache,
  ): Array<PortablePath> {
    const patchedPackages: Array<Package> = []
    project.storedPackages.forEach((storedPackage) => {
      if (storedPackage.reference.startsWith('patch:')) {
        patchedPackages.push(storedPackage)
      }
    })
    const sourcePackagesMap: Map<Locator, Package> = new Map<Locator, Package>()
    for (const patchedPackage of patchedPackages) {
      const {
        sourceLocator 
      } = patchUtils.parseLocator(patchedPackage)
      sourcePackagesMap.set(sourceLocator, patchedPackage)
    }
    const toRemove: Array<PortablePath> = []
    sourcePackagesMap.forEach((patchedPackage, locator) => {
      let used = false
      project.storedPackages.forEach((storedPackage) => {
        if (storedPackage.locatorHash === patchedPackage.locatorHash) {
          return
        }
        storedPackage.dependencies.forEach((dependencyDescriptor) => {
          const resolutionLocatorHash = project.storedResolutions.get(
            dependencyDescriptor.descriptorHash,
          )
          if (resolutionLocatorHash === locator.locatorHash) {
            used = true
          }
        })
      })
      if (!used) {
        const locatorPath = cache.getLocatorPath(
          locator,
          project.storedChecksums.get(locator.locatorHash) ?? null,
        )
        if (locatorPath) {
          toRemove.push(locatorPath)
        }
      }
    })
    return toRemove
  }
}

const plugin: Plugin = { commands: [ProdInstall] }

export default plugin
