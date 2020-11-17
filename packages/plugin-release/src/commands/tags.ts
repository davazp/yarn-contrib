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
  CommandContext 
} from '@yarnpkg/core'
import type {
  Usage 
} from 'clipanion'

// imports

import {
  Configuration,
  Project 
} from '@yarnpkg/core'
import {
  WorkspaceRequiredError 
} from '@yarnpkg/cli'
import versionUtils from '@yarnpkg/plugin-version/lib/versionUtils'
import {
  Command 
} from 'clipanion'

export class ReleaseTags extends Command<CommandContext> {
  @Command.Boolean(`--json`)
  json = false

  @Command.Boolean(`--all`, {description: `Apply the deferred version changes on all workspaces`})
  all = false

  static usage: Usage = Command.Usage({
    description: '',
    details: '',
    examples: [[``, ``]],
  })

  @Command.Path('release', 'tags')
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

    const releases = await versionUtils.resolveVersionFiles(project)

    console.dir(releases)

    return 0
  }
}
