const fs = require('fs')

require(`${__dirname}/../.pnp.js`).setup()

require('ts-node').register({
  compiler: 'ttypescript',
  project: `${__dirname}/../tsconfig.base.json`,
})

const micromatch = require(`micromatch`)

const { main, getPluginConfiguration } = require('@yarnpkg/cli')
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
      if (disabledPlugins &&
        micromatch.match(
          [folder, folder.replace(`plugin-`, ``)],
          disabledPlugins,
        ).length > 0) {
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
    } catch (e) {
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
