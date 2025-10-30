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
[backend-frontend-communication](https://wiki.deckbrew.xyz/en/plugin-dev/backend-frontend-communication) 

* * *
Frontend/Backend Communication
How to communicate between the frontend and backend.
* * *
> This page is about the new plugin API in Decky 3.0
##  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/backend-frontend-communication#frontend-backend-communication) Frontend -> Backend Communication
First, you have to write a backend function.  
This is done by just adding a new method to your `Plugin` class:
```
class Plugin:
    async def my_backend_function(self) -> int:
        return 5

    async def backend_addition(self, parameter_a: int, parameter_b: int) -> str:
        return str(parameter_a + parameter_b)
```

Copy
You can have as many parameters as you like, and *args should (TODO: check this) also work, but **kwargs will not.  
You do not _need_ to provide types for the parameters.  
You can return any data that is serializable to JSON, so dictionaries, lists, ints, floats, strings, etc.
Then, in the frontend, `@decky/api` provides two functions for calling backend methods. Just like for returning values, you can send any JSON serializable data as parameters, like plain objects, arrays, numbers, strings, etc.
###  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/backend-frontend-communication#call) call()
`call` runs a backend function and asynchronously returns the result.  
It takes in the name of the backend function, and then all of the parameters to pass in.  
If the backend function errors then `call` will raise an error, and will include the python traceback. (TODO: this might not actually work for plugins)  
It must be awaited if you want the returned data, but if you don't need the result you do not need to await it, it will still run.
```
import { call } from '@decky/api';

// data1 = 5;
let data1 = await call('my_backend_function');

// data2 = "10"
let data2 = await call('backend_addition', 5, 5);
```

Copy
It can also be given types, if you know the types for the data going in and out.  
In this example, you pass `backend_addition` two numbers (a and b) and it returns a string.
```
import { call } from '@decky/api';

// data1 = 5;
let data1 = await call<[], number>('my_backend_function');

// data2 = "10"
let data2 = await call<[a: number, b: number], string>('backend_addition', 5, 5);
```

Copy
###  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/backend-frontend-communication#callable) callable()
`callable` gives you a JS handle to a backend function, which acts the same as `call`.  
`callable` is synchronous so does not need to be awaited, but the function it returns is asynchronous.
```
import { callable } from '@decky/api';

const adder = callable('backend_addition');
// data = "10";
let data = await adder(5, 5);
```

Copy
Like `call` it can also be given types.  
In this example, you give it two numbers (a and b) and it returns a string.
```
import { callable } from '@decky/api';

const adder = callable<[a: number, b: number], string>('backend_addition');
// data = "10";
let data = await adder(5, 5);
```

Copy
* * *
##  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/backend-frontend-communication#backend-frontend-communication) Backend -> Frontend Communication
Sometimes, data from the backend needs to be delivered to the frontend, like the percentage for a progress bar.  
These can be sent using events. The primary differences between events and calling functions are:
  * Events can trigger multiple functions run that are totally separate from each other.
  * Events do not return any information to the caller.


###  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/backend-frontend-communication#frontend) Frontend
First, you set up the event listener in the frontend. You can use `addEventListener` to register a function that will run every time that event is fired, and use `removeEventListener` to unregister it.
```
import { addEventListener, removeEventListener } from '@decky/api';

let progress = 0;
function updateProgress(new_progress: int) {
    progress = new_progress;
};

addEventListener('progress_update', updateProgress);

// .. later in the code, to remove the listener

removeEventListener('progress_update', updateProgress);
```

Copy
If using this in react code, then a useEffect is the best way to make sure to unregister your event listeners.
```
import { addEventListener, removeEventListener } from '@decky/api';
import { useEffect, useState } from 'react';

function Component() {
    const [progress, setProgress] = useState(0);

    function updateProgress(new_progress: number, information: string) {
        setProgress(new_progress);
        console.log("progress info: ", information);
    };

    useEffect(() => {
        addEventListener('progress_update', updateProgress);

                // this function runs on component unmount
        return () => {
            removeEventListener('progress_update', updateProgress);
                }
    }, [])

        // ...
};
```

Copy
###  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/backend-frontend-communication#backend) Backend
Events can be fired from the backend using `emit`. It is an asynchronous function, and unlike javascript, it must be awaited to run. If you want to run it in a synchronous function, then `asyncio.run(emit("event"))` or something similar should work.
For example, if you wanted to emit an event with no data, then you can just do:
```
await emit("event_name")
```

Copy
And if you wanted to pass some data along with the event, like for the progress bar above:
```
await emit("progress_update", 50, "half way there!")
```

Copy
`emit` is similar to `call`, the first parameter is the event name, and all other parameters are passed to the frontend. And again, data sent along with events must be JSON serializable.
###  [¶](https://wiki.deckbrew.xyz/en/plugin-dev/backend-frontend-communication#the-full-chain-of-function-calls-for-a-plugin-event) The full chain of function calls for a plugin event
[emit](https://github.com/SteamDeckHomebrew/decky-loader/blob/2f90a4fcf7af67f7ed5c044982779579d1624f69/backend/decky_loader/plugin/sandboxed_plugin.py#L91)
emit
[PluginWrapper._response_listener](https://github.com/SteamDeckHomebrew/decky-loader/blob/2f90a4fcf7af67f7ed5c044982779579d1624f69/backend/decky_loader/plugin/plugin.py#L68)
PluginWrapper._response_listener
event: "my_custom_event"  
args: [5]
event: "my_custom_event"...
Unix Socket
Unix Socket
event: "my_custom_event"  
args: [5]  
type: SocketMessageType.EVENT (2)
event: "my_custom_event"...
event: "my_custom_event"  
args: [5]
event: "my_custom_event"...
[plugin_emitted_event](https://github.com/SteamDeckHomebrew/decky-loader/blob/2f90a4fcf7af67f7ed5c044982779579d1624f69/backend/decky_loader/loader.py#L153)
plugin_emitted_event
event: "loader/plugin_event"
args: {
}
event: "loader/plugin_event"arg...
[WSRouter.emit](https://github.com/SteamDeckHomebrew/decky-loader/blob/2f90a4fcf7af67f7ed5c044982779579d1624f69/backend/decky_loader/wsrouter.py#L133)
WSRouter.emit
Websocket
Websocket
type: MessageType.EVENT (3)
event: "loader/plugin_event"  
args: {  
  
  
  
}
type: MessageType.EVENT (3)...
Finds all listeners listening to "loader/plugin_event"
Finds all listeners listening to "loader/plugin_event"
[WSRouter.onMessage](https://github.com/SteamDeckHomebrew/decky-loader/blob/2f90a4fcf7af67f7ed5c044982779579d1624f69/frontend/src/wsrouter.ts#L152)
WSRouter.onMessage
JS Internal Websocket Handling
JS Internal Websocket H...
Args
Args
data: {  

  
  
  
  
  
  
}  
... various other unneeded properties
data: {...[pluginEventListener](https://github.com/SteamDeckHomebrew/decky-loader/blob/2f90a4fcf7af67f7ed5c044982779579d1624f69/frontend/src/plugin-loader.tsx#L684)pluginEventListener
plugin: example_plugin
event: "my_custom_event"  
args: [5]  

plugin: example_plugin...
[pluginEventListener, ...]
[pluginEventListener, ...]
[WSRouter.eventListeners](https://github.com/SteamDeckHomebrew/decky-loader/blob/2f90a4fcf7af67f7ed5c044982779579d1624f69/frontend/src/wsrouter.ts#L72)  

  

  

{  
  
  
  

  

  
  

  
  
}
WSRouter.eventListeners...
[myCustomListener, ...]
[myCustomListener, ...]
[PluginLoader.pluginEventListeners](https://github.com/SteamDeckHomebrew/decky-loader/blob/2f90a4fcf7af67f7ed5c044982779579d1624f69/frontend/src/plugin-loader.tsx#L74)  

  

  

example_plugin: {
"my_custom_event": [
myCustomListener
...
"other_custom_events": [
randomFunctionOne
randomFunctionTwo
...
]
...
}
...
PluginLoader.pluginEventListeners...
Finds all _example_plugin_ 's listeners listening to "my_custom_event"
Finds all example_plugin's listeners listening to "my_custom_event"
JS function call
JS function call
5
5
myCustomListener
myCustomListener
myCustomBackendFunction
myCustomBackendFunction
Function stored in [PluginWrapper.emitted_event_callback](https://github.com/SteamDeckHomebrew/decky-loader/blob/2f90a4fcf7af67f7ed5c044982779579d1624f69/backend/decky_loader/plugin/plugin.py#L51)
Function stored in PluginWrapper.emi...
Plugin Backend
Plugin Backend
Decky Backend
Decky Backend
Decky Frontend
Decky Frontend
Plugin Frontend
Plugin Frontend
[pluginEventListener registered here](https://github.com/SteamDeckHomebrew/decky-loader/blob/2f90a4fcf7af67f7ed5c044982779579d1624f69/frontend/src/plugin-loader.tsx#L101)
pluginEventListener r...
Registered using  
[BackendAPI.addEventListener](https://github.com/SteamDeckHomebrew/decky-loader/blob/2f90a4fcf7af67f7ed5c044982779579d1624f69/frontend/src/plugin-loader.tsx#L643)
Registered using...
The plugin name is stored in [PluginWrapper.name](https://github.com/SteamDeckHomebrew/decky-loader/blob/2f90a4fcf7af67f7ed5c044982779579d1624f69/backend/decky_loader/plugin/plugin.py#L36)
(this name comes from plugin.json)
The plugin name is stored in...Text is not SVG - cannot display
Content is available under the Creative Commons Attribution-NonCommercial-ShareAlike License, by Steam Deck Homebrew. | Powered by [Wiki.js](https://wiki.js.org)
