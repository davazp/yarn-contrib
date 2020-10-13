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

import micromatch from 'micromatch'
import Debug from 'debug'

import {
  Configuration,
  Project,
  structUtils 
} from '@yarnpkg/core'
import {
  main,
  getPluginConfiguration 
} from '@yarnpkg/cli'
import {
  npath 
} from '@yarnpkg/fslib'
import {
  stringifyResolution 
} from '@yarnpkg/parsers'

const disabledPlugins = process.env.DISABLED_PLUGINS
const debug = Debug('@larry1123/yarn-plugin-tools:run-yarn')

export async function run(): Promise<void> {
  const cwd = process.cwd() as PortablePath
  const configuration = await Configuration.find(cwd, null, {
    strict: false,
    usePath: false,
  })
  const {
    project, workspace: rootWorkspace 
  } = await Project.find(
    configuration,
    cwd,
  )
  const yarnVersion =
    rootWorkspace?.manifest.resolutions.find((value) =>
      stringifyResolution(value.pattern).endsWith('@yarnpkg/cli'),
    )?.reference ?? '<unknown>'

  const pluginConfiguration = getPluginConfiguration()
  for (const workspace of project.workspaces.filter((workspace) => {
    const workspaceName = workspace.locator.name
    if (!workspaceName.startsWith('yarn-plugin')) {
      return false
    }
    if (
      (disabledPlugins &&
        micromatch.match(
          [workspaceName, workspaceName.replace(`yarn-plugin-`, ``)],
          disabledPlugins,
        ).length > 0) ||
      workspace.manifest.raw?.pluginEnabled !== true
    ) {
      debug(`${workspaceName} disabled`)
      return false
    }
    return true
  })) {
    const pluginName = structUtils.stringifyLocator(workspace.locator)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const plugin: unknown = require(npath.fromPortablePath(workspace.cwd))
      const overrideName = `@yarnpkg/${workspace.locator.name.replace(
        /^yarn-/,
        '',
      )}`
      debug(`${pluginName} loaded as ${overrideName}`)
      pluginConfiguration.plugins.add(overrideName)
      pluginConfiguration.modules.set(overrideName, plugin)
    }
    catch (e) {
      debug(`${pluginName} disabled non-requirable: ${(e as Error)?.message}`)
    }
  }

  return main({
    binaryVersion: yarnVersion,
    pluginConfiguration: pluginConfiguration,
  })
}
