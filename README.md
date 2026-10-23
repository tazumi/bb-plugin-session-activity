# bb-plugin-session-activity

A [BB](https://getbb.app) plugin that makes session status in the sidebar easy to read at a glance.

You see which agents are working, which finished, and which run a background command, without opening them.

## What it looks like

- Running session: the spinner always turns, with a soft breathing fade.
- Running background command: the console icon keeps its prompt arrow and types three dots one after another.
- Finished, unread session: a green dot, the same size as BB's grey one.
- Finished, read session: a green check.

Open [`docs/demo-sidebar.html`](docs/demo-sidebar.html) in a browser to see all states in light and dark themes.

## Why the spinner needed a fix

BB draws the running spinner with `animate-spin motion-reduce:animate-none`.
When the OS asks for reduced motion, the spinner freezes and looks like a static icon.
This plugin keeps it turning in every setup.

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

BB draws the status icons and labels them with `aria-label`:
`Thread working`, `Unread thread succeeded`, `Background command running`.

- The plugin injects one stylesheet that targets those labels.
- The console icon is replaced with a copy that has animated dots.
A mutation observer swaps new icons as rows appear.
- The check for read sessions uses the content-script row status setter.
An app overlay reads the sidebar thread list and sets it on idle threads that BB draws nothing for.
- Every colour is the theme's `--success` variable.

If BB renames the labels, the styles stop matching.

## Related

[bb-plugin-session-todos](https://github.com/tazumi/bb-plugin-session-todos) shows the agent's todo list above the composer.

## License

MIT
