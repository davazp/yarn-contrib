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

const fs = require('fs')

require(`${__dirname}/../.pnp.js`).setup()

require('ts-node').register({
  compiler: 'ttypescript',
  project: `${__dirname}/../tsconfig.base.json`,
})

const micromatch = require(`micromatch`)

const {
 main, getPluginConfiguration 
} = require('@yarnpkg/cli')

global.YARN_VERSION = require(`@yarnpkg/cli/package.json`).version

const pluginsDir = `${__dirname}/../packages/`

const disabledPlugins = process.env.DISABLED_PLUGINS

function getExtendedPluginConfiguration() {
  const folders = fs.readdirSync(pluginsDir)

  const pluginFolders = folders.filter((folder) => {
    if (!folder.startsWith(`plugin-`)) return false

    /**
     * Checks if a plugin is disabled by ENV or disabled in the plugin's manifest
     * @returns {boolean}
     */
    function checkIfDisabled() {
      if (
        disabledPlugins &&
        micromatch.match(
          [folder, folder.replace(`plugin-`, ``)],
          disabledPlugins,
        ).length > 0
      ) {
        return true
      }
      try {
        const manifest = require(`${pluginsDir}/${folder}/package.json`)
        return !manifest.pluginEnabled
      }
      catch (_) {
        return true
      }
    }

    if (checkIfDisabled()) {
      console.warn(`Disabled plugin ${folder}`)
      return false
    }

    let isRequirable
    try {
      require(`${pluginsDir}${folder}`)
      isRequirable = true
    }
    catch (e) {
      console.warn(`Disabled non-requirable plugin ${folder}: ${e.message}`)
      isRequirable = false
    }
    return isRequirable
  })

  const pluginConfiguration = getPluginConfiguration()

  for (const folder of pluginFolders) {
    pluginConfiguration.plugins.add(`@yarnpkg/${folder}`)
    pluginConfiguration.modules.set(
      `@yarnpkg/${folder}`,
      require(`${pluginsDir}${folder}`),
    )
  }

  return pluginConfiguration
}

main({
  binaryVersion: global.YARN_VERSION || '<unknown>',
  pluginConfiguration: getExtendedPluginConfiguration(),
})
