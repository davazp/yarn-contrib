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

import {
  Configuration,
  Project,
  Report,
  httpUtils,
  tgzUtils,
  structUtils,
  Cache,
} from '@yarnpkg/core'
import {
  getPluginConfiguration 
} from '@yarnpkg/cli'
import {
  CwdFS,
  xfs 
} from '@yarnpkg/fslib'

const yarnDownloadUrl = 'https://github.com/yarnpkg/berry/archive/master.tar.gz'

export async function genResolutions(
  project: Project,
  report: Report,
): Promise<Map<string, string>> {
  const sourceBuffer: Buffer = await report.startTimerPromise(
    'Downloading yarn repo archive',
    async () => {
      return (await httpUtils.get(yarnDownloadUrl, {configuration: project.configuration})) as Buffer
    },
  )
  return await xfs.mktempPromise(async (extractPath) => {
    const extractTarget = new CwdFS(extractPath)

    await report.startTimerPromise('Extracting yarn repo', async () => {
      await tgzUtils.extractArchiveTo(sourceBuffer, extractTarget, {stripComponents: 1})
    })

    const configuration = await Configuration.find(
      extractPath,
      getPluginConfiguration(),
      {
        usePath: false,
        strict: false,
      },
    )
    const {
      project: yarnProject 
    } = await Project.find(
      configuration,
      extractPath,
    )

    await yarnProject.restoreInstallState()

    const resolutions: Map<string, string> = new Map<string, string>()
    for (const workspace of yarnProject.workspaces) {
      if (workspace.manifest.private) {
        continue
      }
      resolutions.set(
        structUtils.stringifyIdent(workspace.locator),
        workspace.manifest.version ?? '0.0.0',
      )
      if (workspace.locator.name === 'core') {
        resolutions.set(
          'clipanion',
          workspace.manifest.dependencies.get(
            structUtils.makeIdent(null, 'clipanion').identHash,
          )?.range ?? '0.0.0',
        )
      }
    }
    return resolutions
  })
}

export async function updateProjectResolutions(
  project: Project,
  resolutions: Map<string, string>,
  report: Report,
): Promise<void> {
  const {
    manifest 
  } = project.topLevelWorkspace
  const rawManifest = manifest.exportTo({})
  if (!rawManifest.resolutions) {
    rawManifest.resolutions = {}
  }
  for (const [pkg, version] of resolutions.entries()) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    rawManifest.resolutions[pkg] = version
  }
  manifest.load(rawManifest)
  await project.topLevelWorkspace.persistManifest()

  const cache = await Cache.find(project.configuration)
  await project.install({
    cache,
    report,
  })
}
