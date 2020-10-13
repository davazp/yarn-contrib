"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProjectResolutions = exports.genResolutions = exports.runYarn = void 0;
var run_yarn_1 = require("./run-yarn");
Object.defineProperty(exports, "runYarn", { enumerable: true, get: function () { return run_yarn_1.run; } });
var yarnResolutions_1 = require("./yarnResolutions");
Object.defineProperty(exports, "genResolutions", { enumerable: true, get: function () { return yarnResolutions_1.genResolutions; } });
Object.defineProperty(exports, "updateProjectResolutions", { enumerable: true, get: function () { return yarnResolutions_1.updateProjectResolutions; } });
