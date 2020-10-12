import { Project, Report } from '@yarnpkg/core';
export declare function genResolutions(project: Project, report: Report): Promise<Map<string, string>>;
export declare function updateProjectResolutions(project: Project, resolutions: Map<string, string>, report: Report): Promise<void>;
