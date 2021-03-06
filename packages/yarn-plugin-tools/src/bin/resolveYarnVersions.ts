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
  StreamReport 
} from '@yarnpkg/core'
import {
  npath,
  xfs 
} from '@yarnpkg/fslib'
import {
  getPluginConfiguration 
} from '@yarnpkg/cli'

import {
  downloadAndExtractYarn,
  genResolutions,
  readyYarnProject,
  updateInstall,
  updateProjectResolutions,
} from '../yarnResolutions'

async function main() {
  const cwd = npath.toPortablePath(process.cwd())
  const configuration = await Configuration.find(
    cwd,
    getPluginConfiguration(),
    { strict: false },
  )
  const {
    project 
  } = await Project.find(configuration, cwd)

  const report = new StreamReport({
    configuration,
    stdout: process.stdout,
  })

  const resolutions = await xfs.mktempPromise(async (extractPath) => {
    await downloadAndExtractYarn(project, extractPath, report)
    const yarnProject = await readyYarnProject(extractPath, report)
    return await genResolutions(yarnProject, report)
  })

  await updateProjectResolutions(project, resolutions, report)
  await updateInstall(project, report)

  await report.finalize()
  return report.exitCode()
}

main()
  .then((exitCode) => {
    process.exit(exitCode)
  })
  .catch(console.error.bind(console))
