Deckbrew
Search...
[](https://wiki.deckbrew.xyz/t)
[](https://wiki.deckbrew.xyz/login)
* * *
/ sidebar.root
plugin-dev
* * *
Current Directory
[Environment Variables](https://wiki.deckbrew.xyz/en/plugin-dev/env-vars)[Frontend Debugging](https://wiki.deckbrew.xyz/en/plugin-dev/cef-debugging)[Frontend/Backend Communication](https://wiki.deckbrew.xyz/en/plugin-dev/backend-frontend-communication)[Getting Started](https://wiki.deckbrew.xyz/en/plugin-dev/getting-started)[Migrating to the new decky API](https://wiki.deckbrew.xyz/en/plugin-dev/new-api-migration)[Review and Testing Process](https://wiki.deckbrew.xyz/en/plugin-dev/review-and-testing)[Route Patching](https://wiki.deckbrew.xyz/en/plugin-dev/route-patching)[Submitting Plugins](https://wiki.deckbrew.xyz/en/plugin-dev/submitting-plugins)
  * /
[plugin-dev](https://wiki.deckbrew.xyz/en/plugin-dev)
  * /
[new-api-migration](https://wiki.deckbrew.xyz/en/plugin-dev/new-api-migration) 

* * *
Migrating to the new decky API
Steps for migrating an existing plugin to the new websocket-based system.
* * *
> Migration is totally optional, and backwards compatibility is intended to be kept for as long as we can. It is recommended to migrate, as the new api is easier to use and adds new features, but there is no major rush to get this done.
> You can see a full migration example [here](https://github.com/SteamDeckHomebrew/decky-plugin-template/compare/main...aa/websockets), although this also makes some actual functional changes in `main.py` [todo: point to specific commits later]
#  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/new-api-migration#migration) Migration
The new API is only supported in decky 3.0 and later.
The python library `decky_plugin` has been renamed to `decky`, but all pre-existing methods are unchanged there and the old `decky_plugin` name is still provided for convenience, so no changes should be required on the python end.
In the frontend, `decky-frontend-lib` has been split into two libraries, [`@decky/api`](https://github.com/SteamDeckHomebrew/loader-api) and [`@decky/ui`](https://github.com/SteamDeckHomebrew/decky-frontend-lib/tree/v4-dev). DFL's _ServerAPI_ has been completely removed, and replaced by new functions in `@decky/api`.
##  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/new-api-migration#deckyui) @decky/ui
`@decky/ui` contains all the react components and similar from DFL, largely unchanged. Aside from removing all _ServerAPI_ usage and a couple other functions, a simple rename of `decky-frontend-lib` should work.
##  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/new-api-migration#deckyapi) @decky/api
[`@decky/api`](https://github.com/SteamDeckHomebrew/loader-api) contains all the other functions that aren't just react elements.
For calling the backend, _ServerAPI.callPluginMethod_ has been replaced by _call_ which has a very similar interface, but it returns its result directly, instead of through an intermediary interface. Any backend errors will be raised and bubble up as JS errors.
```
// before
import { ServerAPI } from "decky-frontend-lib";
interface AddMethodArgs { a: number; b: number; }
const res = await serverAPI.callPluginMethod<AddMethodArgs, number>("add", {a: 1, b: 2});
if (res.success) {
    console.log(res.result);
}

// after
import { call } from "@decky/api";
const res = await call<[a: number, b: number], number>("add", 1, 2);
console.log(res);
```

Copy
Various methods like _toaster_ , _routerHook_ , _openFilePicker_ , _executeInTab_ , _injectCssIntoTab_ , _removeCssFromTab_ , _fetchNoCors_ , _getExternalResourceURL_ and _definePlugin_ have been moved to `@decky/api`. They are unchanged so you will just need to change where you import them from.
> You can read more about using the new api [here](https://wiki.deckbrew.xyz/plugin-dev/backend-frontend-communication)
##  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/new-api-migration#important-file-changes) Important file changes
###  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/new-api-migration#pluginjson) plugin.json
You need to add `"api_version": 1`, so decky knows which version of the api to serve you.
###  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/new-api-migration#packagejson-pnpm-lockyaml) package.json (/ pnpm-lock.yaml)
Remove all references to `decky-frontend-lib` from the file completely.  
Add `@decky/api` and `@decky/ui` to your `dependencies`.  
Add `@decky/rollup` to your `devDependencies`.  
Add `"type": "module"` just below where you set the name and description.
###  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/new-api-migration#decky_pluginpyi-deckypyi) decky_plugin.pyi → decky.pyi
The file has been renamed (because the library was renamed), and has extra fields for the new backend functions. Copy it in from [the template](https://github.com/SteamDeckHomebrew/decky-plugin-template/blob/aa/websockets/decky.pyi) or from [decky](https://github.com/SteamDeckHomebrew/decky-loader/blob/main/backend/decky_loader/plugin/imports/decky.pyi).
###  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/new-api-migration#rollupconfigjs) rollup.config.js
The new [`@decky/rollup`](https://github.com/SteamDeckHomebrew/rollup-preset-decky) dependency you added means this is all set up properly for you by just importing `deckyPlugin` and using that as your rollup config.
```
import deckyPlugin from "@decky/rollup";

export default deckyPlugin({
  // Add your extra Rollup options here
)
```

Copy
Content is available under the Creative Commons Attribution-NonCommercial-ShareAlike License, by Steam Deck Homebrew. | Powered by [Wiki.js](https://wiki.js.org)
