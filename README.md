# bb-plugin-session-activity

A BB plugin that makes session status in the sidebar easier to read.

- Running sessions: the spinner always turns, even when the OS asks for reduced motion, with a soft breathing fade.
- Finished, unread sessions: the grey dot becomes a green dot of the same size.
- Finished, read sessions: a green check.

The colour is the theme's `--success` variable, so it follows the active BB theme.

## Install

```
bb plugin install git:github.com/tazumi/bb-plugin-session-activity
```

## Develop

```
npm install
bb plugin build .
bb plugin install .
bb plugin reload session-activity
```

## How it works

The spinner and dots are drawn by BB and labelled with `aria-label` (`Thread working`, `Unread thread succeeded`).
The plugin injects a stylesheet that targets those labels.
The check for read sessions uses the content-script row status setter, driven by an app overlay that reads the sidebar thread list.
If BB renames those labels, the styles stop matching.

## License

MIT
