import {
  Cache,
  Configuration,
  Plugin,
  Project,
  StreamReport,
  CommandContext,
} from '@yarnpkg/core'
import { WorkspaceRequiredError } from '@yarnpkg/cli'
import { PortablePath, ppath, toFilename, xfs } from '@yarnpkg/fslib'
import { Command, Usage } from 'clipanion'

import { copyFile, copyFolder } from './util'
import { ProductionInstallFetcher } from './ProductionInstallFetcher'
import { ProductionInstallResolver } from './ProductionInstallResolver'

class ProdInstall extends Command<CommandContext> {
  @Command.String()
  outDirectory!: string

  @Command.Boolean(`--json`)
  json: boolean = false

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
  async execute() {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins,
    )
    const { project, workspace } = await Project.find(
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
            if (configuration.get('bstatePath')) {
              yarnExcludes.push(configuration.get('bstatePath'))
            }
            if (configuration.get('installStatePath')) {
              yarnExcludes.push(configuration.get('installStatePath'))
            }
            if (configuration.get('cacheFolder')) {
              yarnExcludes.push(configuration.get('cacheFolder'))
            }
            if (configuration.get('pnpUnpluggedFolder')) {
              yarnExcludes.push(configuration.get('pnpUnpluggedFolder'))
            }
            if (configuration.get('deferredVersionFolder')) {
              yarnExcludes.push(configuration.get('deferredVersionFolder'))
            }
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
            const packagePath = ppath.join(
              outDirectoryPath,
              toFilename('package.json'),
            )
            const pak = await xfs.readJsonPromise(packagePath)
            if (pak.devDependencies) {
              delete pak.devDependencies
            }
            await xfs.writeJsonPromise(packagePath, pak)
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
          },
        )
      },
    )

    return report.exitCode()
  }
}

const plugin: Plugin = {
  commands: [ProdInstall],
}

export default plugin
