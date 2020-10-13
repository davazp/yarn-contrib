# @larry1123/yarn-plugin-tools

## Commands

### `resolveYarnVersions`

Clones the berry repo to fetch the latest version of all public packages along with `clipanion` version found in `@yarnpkg/core` and set the project's resolutions. Runs `yarn install` at the end to ensure a valid project state.

#### Usage

- `yarn run resolveYarnVersions`
- `yarn run:resolveYarnVersions`

## Scripts

### `runYarn`

Runs yarn with plugins loaded from within the project

- Set `global.YARN_VERSION` before running or bad things could happen.
- `DEBUG=@larry1123/yarn-plugin-tools:run-yarn` will log startup debug info.
- `DISABLED_PLUGINS=production-install,yarn-plugin-script-lifecycles` will disable said plugins.
- `package.json` `{"pluginEnabled": true}` must be set, or the plugin will not be loaded.
