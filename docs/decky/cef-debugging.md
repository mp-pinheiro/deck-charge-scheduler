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
[cef-debugging](https://wiki.deckbrew.xyz/en/plugin-dev/cef-debugging) 

* * *
Frontend Debugging
How to open the remote chromium debugger
* * *
#  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/cef-debugging#the-cef-debugger) The CEF debugger
The CEF (Chromium Embedded Framework) debugger is very useful for debugging your plugins or looking at valve’s internal components. It allows you to view the html, css and js in the browser and edit it live, as well as run JS code live in the console.
![cef-example.png](https://wiki.deckbrew.xyz/plugin-dev/cef-example.png)
There are several tabs, the important ones are (note that there may be extra text at the end of the tab name, like `_uid2`):
  * `SharedJSContext` - A tab with no UI, where most of the JS is run. This is likely where the result of `console.log` will appear.
  * `Steam Big Picture Mode` - The main UI of the Steam Deck
  * `QuickAccess` - The Quick Access overlay
  * `MainMenu` - The Steam menu overlay


##  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/cef-debugging#_setup) Setup
|  If you aren’t on windows, you can use `steamdeck` instead of your steam deck’s IP.   
---|---  
|  Only do this on a trusted network, as everyone on your network can get full access to the debugger.   
---|---  
###  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/cef-debugging#_standard_setup_try_this_first) Standard setup, try this first
  1. Turn on the "Allow Remote CEF Debugging" setting in Decky’s developer settings.
     * If you don’t have decky installed, you can enable CEF debugging manually by putting an empty file called `.cef-enable-remote-debugging` in `~/.steam/steam/`
  2. Open a Chromium-based browser on your desktop pc (ex. Google Chrome, Microsoft Edge, Brave).
  3. Go to the inspect page of your browser (ex. `chrome://inspect`, `edge://inspect`, `brave://inspect`).
  4. Under "Discover network targets", click "Configure", and enter `DECK_IP:8081`.
     * You need to be on the same network as your Steam Deck.
     * You can find the IP of your Steam Deck by going into your internet settings, selecting the currently connected network, and looking at the "IP Address" field.
     * If working on the same device as you are running steam on, use `localhost:8080`
  5. Wait a few seconds, and you will see multiple tabs appear under "Remote Target"
  6. After selecting a tab, you should be able to see the HTML and CSS used for that specific tab, like the screenshot above.


###  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/cef-debugging#_alternate_setup) Alternate setup
  1. Turn on the "Allow Remote CEF Debugging" setting in Decky’s developer settings.
  2. Open a Chromium-based browser (ex. Google Chrome, Microsoft Edge, Brave).
  3. Enter `http://DECK_IP:8081[](http://DECK_IP:8081)` in the browser.
     * You need to be on the same network as your Steam Deck.
     * You can find the IP of your Steam Deck by going into your internet settings, selecting the currently connected network, and looking at the "IP Address" field.
     * If working on the same device as you are running steam on, use `http://localhost:8080[](http://localhost:8080)`
  4. Select a tab.
  5. After selecting a tab, you should be able to see the HTML and CSS used for that specific tab, like the screenshot above.


|  Remember to disable it after you’ve finished!   
---|---  
##  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/cef-debugging#_usage) Usage
###  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/cef-debugging#_testing_out_code_live) Testing out code live
The SharedJSContext page can be used for running JS live (the other windows do not work for running JS). Within it, the SteamClient is available as a global object (`window.SteamClient`) and information about many of its functions can be viewed [here](https://github.com/SteamDeckHomebrew/decky-frontend-lib/pull/92/files). Decky loader also exposes all of decky frontend lib as `window.DFL`.
Your browser does not support the video tag. 
###  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/cef-debugging#_editing_css_live) Editing CSS live
The element picker in the top left of the debugger menu can be used to easily select any element in the UI, and then the style menu at the bottom can be used for extracting or editing css live. In the example below a colour is extracted from the UI. More information on how to use it for this purpose can be viewed in the [CSS loader docs](https://docs.deckthemes.com/CSSLoader/theming_step_by_step/#using-the-cef-debugger-effectively).
Your browser does not support the video tag. 
Content is available under the Creative Commons Attribution-NonCommercial-ShareAlike License, by Steam Deck Homebrew. | Powered by [Wiki.js](https://wiki.js.org)
