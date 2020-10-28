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

// Types

import type {
  Readable,
  Writable 
} from 'stream'

import type {
  PortablePath 
} from '@yarnpkg/fslib'
import type {
  Hooks,
  Locator,
  Plugin,
  Project 
} from '@yarnpkg/core'

// Imports
import {
  scriptUtils,
  SettingsType 
} from '@yarnpkg/core'

type ProcessEnvironment = { [key: string]: string }
type PluginHooks = {
  wrapScriptExecution: Hooks['wrapScriptExecution']
}

const prefixes = {
  pre: 'pre-',
  post: 'post-',
}

async function wrapScriptExecution(
  executor: () => Promise<number>,
  project: Project,
  locator: Locator,
  scriptName: string,
  extra: {
    script: string
    args: Array<string>
    cwd: PortablePath
    env: ProcessEnvironment
    stdin: Readable | null
    stdout: Writable
    stderr: Writable
  },
): Promise<() => Promise<number>> {
  const {
    configuration 
  } = project
  const userScriptLifecycleExcludes: Map<string, boolean> = configuration.get(
    'userScriptLifecycleExcludes',
  )
  const lifecycleScriptEnabled = !userScriptLifecycleExcludes.get(scriptName)

  return async () => {
    const workspaceByCwd = project.tryWorkspaceByLocator(locator)
    if (workspaceByCwd === null) {
      return executor()
    }
    const manifest = workspaceByCwd.manifest
    const script = manifest.scripts.get(scriptName)
    if (typeof script === `undefined`) {
      return 1
    }

    async function tryLifecycleScript(lifecycle: string): Promise<number> {
      const lifecycleScriptName = `${lifecycle}${scriptName}`
      if (
        lifecycleScriptEnabled &&
        (await scriptUtils.hasPackageScript(locator, lifecycleScriptName, {project}))
      ) {
        return await scriptUtils.executePackageScript(
          locator,
          lifecycleScriptName,
          [],
          {
            cwd: extra.cwd,
            project,
            stdin: extra.stdin,
            stdout: extra.stdout,
            stderr: extra.stderr,
          },
        )
      }
      else {
        return 0
      }
    }

    if (!scriptName.startsWith(prefixes.pre)) {
      const pre = await tryLifecycleScript(prefixes.pre)
      if (pre !== 0) {
        return pre
      }
    }

    const runMainScript = async () => {
      return await scriptUtils.executePackageShellcode(
        locator,
        script,
        extra.args,
        {
          cwd: extra.cwd,
          project,
          stdin: extra.stdin,
          stdout: extra.stdout,
          stderr: extra.stderr,
        },
      )
    }
    const main = await runMainScript()
    if (main !== 0) {
      return main
    }
    if (!scriptName.startsWith(prefixes.post)) {
      const post = await tryLifecycleScript(prefixes.post)
      if (post !== 0) {
        return post
      }
    }

    return 0
  }
}

declare module '@yarnpkg/core' {
  interface ConfigurationValueMap {
    userScriptLifecycleExcludes: Map<string, boolean>
  }
}

const plugin: Plugin<PluginHooks> = {
  hooks: { wrapScriptExecution },
  configuration: {
    userScriptLifecycleExcludes: {
      description: '',
      type: SettingsType.MAP,
      valueDefinition: {
        description: '',
        type: SettingsType.BOOLEAN,
      },
    },
  },
}

export default plugin
