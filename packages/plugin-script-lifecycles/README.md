# Yarn Plugin Script Lifecycles

This plugin will run `pre-` and `post-` scripts for each script within a project.
`userScriptLifecycleExcludes` can be set within yarn config to exclude a list of scripts.
Logs will be formatted so output is more understandable between scripts, within the same run.

This is an example output.

```
➤ YN0000: ➤ YN0000: ┌ Running pre-test
➤ YN0000: ➤ YN0000: │ ➤ echo pre
➤ YN0000: ➤ YN0000: │ pre
➤ YN0000: ➤ YN0000: └ Completed in 0.28s
➤ YN0000: ➤ YN0000: Done in 0.36s
➤ YN0000: ┌ Running test
➤ YN0000: │ ➤ echo test
➤ YN0000: │ test
➤ YN0000: └ Completed
➤ YN0000: ➤ YN0000: ┌ Running post-test
➤ YN0000: ➤ YN0000: │ ➤ echo post
➤ YN0000: ➤ YN0000: │ post
➤ YN0000: ➤ YN0000: └ Completed
➤ YN0000: ➤ YN0000: Done in 0.28s
➤ YN0000: Done in 1.2s

```

## Install instructions

```
TODO
```
