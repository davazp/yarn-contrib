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
  PortablePath 
} from '@yarnpkg/fslib'

// imports

import {
  Configuration,
  Project,
  Report,
  httpUtils,
  execUtils,
  structUtils,
  tgzUtils,
} from '@yarnpkg/core'
import {
  getPluginConfiguration 
} from '@yarnpkg/cli'
import {
  parseResolution 
} from '@yarnpkg/parsers'
import {
  CwdFS 
} from '@yarnpkg/fslib'

const yarnDownloadUrl = 'https://github.com/yarnpkg/berry/archive/master.tar.gz'

export async function downloadYarnRepo(
  project: Project,
  report: Report,
): Promise<Buffer> {
  return await report.startTimerPromise(
    'Downloading yarn repo archive',
    async () => {
      return (await httpUtils.get(yarnDownloadUrl, {configuration: project.configuration})) as Buffer
    },
  )
}

export async function downloadAndExtractYarn(
  project: Project,
  extractPath: PortablePath,
  report: Report,
): Promise<void> {
  const sourceBuffer = await downloadYarnRepo(project, report)
  const extractTarget = new CwdFS(extractPath)
  await report.startTimerPromise('Extracting yarn repo', async () => {
    await tgzUtils.extractArchiveTo(sourceBuffer, extractTarget, {stripComponents: 1})
  })
}

export async function readyYarnProject(
  yarnPath: PortablePath,
  report: Report,
): Promise<Project> {
  report.reportInfo(null, 'Readying yarn project')
  const configuration = await Configuration.find(
    yarnPath,
    getPluginConfiguration(),
    {
      usePath: false,
      strict: false,
    },
  )
  const {
    project: yarnProject 
  } = await Project.find(configuration, yarnPath)
  await yarnProject.restoreInstallState()
  return yarnProject
}

export async function genResolutions(
  yarnProject: Project,
  report: Report,
): Promise<Map<string, string>> {
  report.reportInfo(null, 'Getting yarn workspaces versions.')
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
}

export async function updateProjectResolutions(
  project: Project,
  resolutions: Map<string, string>,
  report: Report,
): Promise<void> {
  const {
    manifest 
  } = project.topLevelWorkspace
  for (const [pkg, version] of resolutions.entries()) {
    manifest.resolutions.push({
      pattern: parseResolution(pkg),
      reference: version,
    })
  }
  report.reportInfo(null, 'Persisting Manifest')
  await project.topLevelWorkspace.persistManifest()
}

export async function updateInstall(
  project: Project,
  report: Report,
): Promise<void> {
  report.reportInfo(null, 'Running install to update project')
  const passThrough = report.createStreamReporter()
  await execUtils.pipevp('yarn', ['install'], {
    cwd: project.cwd,
    stdin: null,
    stdout: passThrough,
    stderr: passThrough,
  })
  passThrough.destroy()
}
