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

require(`${__dirname}/../.pnp.js`).setup()

require('ts-node').register({
  compiler: 'ttypescript',
  transpileOnly: true,
  project: `${__dirname}/../tsconfig.base.json`,
})

global.YARN_VERSION = require(`@larry1123/yarn-contrib/package.json`).resolutions[
  '@yarnpkg/cli'
]

const {
 runYarn 
} = require('@larry1123/yarn-plugin-tools')

const disabledPlugins = process.env.DISABLED_PLUGINS

runYarn(process.cwd(), disabledPlugins).catch(console.error.bind(console))
