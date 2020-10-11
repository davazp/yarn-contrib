import type { Hooks, Plugin } from '@yarnpkg/core';
declare type PluginHooks = {
    wrapScriptExecution: Hooks['wrapScriptExecution'];
};
declare module '@yarnpkg/core' {
    interface ConfigurationValueMap {
        userScriptLifecycleExcludes: Map<string, boolean>;
    }
}
declare const plugin: Plugin<PluginHooks>;
export default plugin;
