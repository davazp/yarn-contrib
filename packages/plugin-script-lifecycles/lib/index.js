"use strict";
// Types
Object.defineProperty(exports, "__esModule", { value: true });
// Imports
const core_1 = require("@yarnpkg/core");
const prefixes = {
    pre: 'pre-',
    post: 'post-',
};
async function wrapScriptExecution(executor, project, locator, scriptName, extra) {
    const { configuration } = project;
    const userScriptLifecycleExcludes = configuration.get('userScriptLifecycleExcludes');
    const lifecycleScriptEnabled = !userScriptLifecycleExcludes.get(scriptName);
    const shouldReport = extra.env['plugin_script_lifecycles_silent'] != undefined;
    return async () => {
        var _a;
        const report = shouldReport
            ? new core_1.StreamReport({
                configuration,
                stdout: extra.stdout,
            })
            : null;
        const workspaceByCwd = project.tryWorkspaceByLocator(locator);
        if (workspaceByCwd === null) {
            return executor();
        }
        const manifest = workspaceByCwd.manifest;
        const script = manifest.scripts.get(scriptName);
        if (typeof script === `undefined`) {
            return 1;
        }
        async function tryLifecycleScript(lifecycle) {
            const lifecycleScriptName = `${lifecycle}${scriptName}`;
            if (lifecycleScriptEnabled &&
                (await core_1.scriptUtils.hasPackageScript(locator, lifecycleScriptName, { project }))) {
                const streamReporter = report === null || report === void 0 ? void 0 : report.createStreamReporter();
                try {
                    return await core_1.scriptUtils.executePackageScript(locator, lifecycleScriptName, [], {
                        cwd: extra.cwd,
                        project,
                        stdin: extra.stdin,
                        stdout: streamReporter !== null && streamReporter !== void 0 ? streamReporter : extra.stdout,
                        stderr: streamReporter !== null && streamReporter !== void 0 ? streamReporter : extra.stderr,
                    });
                }
                finally {
                    streamReporter === null || streamReporter === void 0 ? void 0 : streamReporter.destroy();
                }
            }
            else {
                return 0;
            }
        }
        try {
            if (!scriptName.startsWith(prefixes.pre)) {
                const pre = await tryLifecycleScript(prefixes.pre);
                if (pre !== 0) {
                    return pre;
                }
            }
            const runMainScript = async () => {
                report === null || report === void 0 ? void 0 : report.reportInfo(null, `➤ ${script}`);
                const streamReporter = report === null || report === void 0 ? void 0 : report.createStreamReporter();
                try {
                    return await core_1.scriptUtils.executePackageShellcode(locator, script, extra.args, {
                        cwd: extra.cwd,
                        project,
                        stdin: extra.stdin,
                        stdout: streamReporter !== null && streamReporter !== void 0 ? streamReporter : extra.stdout,
                        stderr: streamReporter !== null && streamReporter !== void 0 ? streamReporter : extra.stderr,
                    });
                }
                finally {
                    streamReporter === null || streamReporter === void 0 ? void 0 : streamReporter.destroy();
                }
            };
            const main = (_a = (await (report === null || report === void 0 ? void 0 : report.startTimerPromise(`Running ${scriptName}`, runMainScript)))) !== null && _a !== void 0 ? _a : (await runMainScript());
            if (main !== 0) {
                report === null || report === void 0 ? void 0 : report.reportError(core_1.MessageName.EXCEPTION, `Script '${scriptName}' returned non-zero return code. (${main})`);
                return main;
            }
            if (!scriptName.startsWith(prefixes.post)) {
                const post = await tryLifecycleScript(prefixes.post);
                if (post !== 0) {
                    return post;
                }
            }
        }
        finally {
            await (report === null || report === void 0 ? void 0 : report.finalize());
        }
        return 0;
    };
}
const plugin = {
    hooks: { wrapScriptExecution },
    configuration: {
        userScriptLifecycleExcludes: {
            description: '',
            type: core_1.SettingsType.MAP,
            valueDefinition: {
                description: '',
                type: core_1.SettingsType.BOOLEAN,
            },
        },
    },
};
exports.default = plugin;
