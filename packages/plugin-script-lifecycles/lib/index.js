"use strict";
// Types
Object.defineProperty(exports, "__esModule", { value: true });
// Imports
const core_1 = require("@yarnpkg/core");
const prefixes = {
    pre: 'pre-',
    post: 'post-',
};
async function wrapScriptExecution(_executor, project, locator, scriptName, extra) {
    const { configuration } = project;
    const userScriptLifecycleExcludes = configuration.get('userScriptLifecycleExcludes');
    const lifecycleScriptEnabled = !userScriptLifecycleExcludes.get(scriptName);
    return async () => {
        const report = new core_1.StreamReport({
            configuration,
            stdout: extra.stdout,
        });
        const workspaceByCwd = project.getWorkspaceByLocator(locator);
        const manifest = workspaceByCwd.manifest;
        const script = manifest.scripts.get(scriptName);
        if (typeof script === `undefined`) {
            return 1;
        }
        async function tryLifecycleScript(lifecycle) {
            const lifecycleScriptName = `${lifecycle}${scriptName}`;
            if (lifecycleScriptEnabled &&
                (await core_1.scriptUtils.hasPackageScript(locator, lifecycleScriptName, { project }))) {
                const streamReporter = report.createStreamReporter();
                try {
                    return await core_1.scriptUtils.executePackageScript(locator, lifecycleScriptName, [], {
                        cwd: extra.cwd,
                        project,
                        stdin: extra.stdin,
                        stdout: streamReporter,
                        stderr: streamReporter,
                    });
                }
                finally {
                    streamReporter.destroy();
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
            const main = await report.startTimerPromise(`Running ${scriptName}`, async () => {
                report.reportInfo(null, `➤ ${script}`);
                const streamReporter = report.createStreamReporter();
                try {
                    // TODO FIX STREAM REPORTER
                    return await core_1.scriptUtils.executePackageShellcode(locator, script, extra.args, {
                        cwd: extra.cwd,
                        project,
                        stdin: extra.stdin,
                        // stdout: streamReporter,
                        stdout: extra.stdout,
                        // stderr: streamReporter,
                        stderr: extra.stderr,
                    });
                }
                finally {
                    streamReporter.destroy();
                }
            });
            if (main !== 0) {
                report.reportError(core_1.MessageName.EXCEPTION, `Script '${scriptName}' returned non-zero return code. (${main})`);
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
            await report.finalize();
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
