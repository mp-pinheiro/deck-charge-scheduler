import {
  ButtonItem,
  DropdownItem,
  PanelSection,
  PanelSectionRow,
  SingleDropdownOption,
  staticClasses
} from "@decky/ui";
import {
  addEventListener,
  removeEventListener,
  callable,
  definePlugin,
  toaster,
  // routerHook
} from "@decky/api"
import { useState } from "react";
import { FaShip } from "react-icons/fa";

// import logo from "../assets/logo.png";

// This function calls the python function "add", which takes in two numbers and returns their sum (as a number)
// Note the type annotations:
//  the first one: [first: number, second: number] is for the arguments
//  the second one: number is for the return value
const add = callable<[first: number, second: number], number>("add");

// This function calls the python function "start_timer", which takes in no arguments and returns nothing.
// It starts a (python) timer which eventually emits the event 'timer_event'
const startTimer = callable<[], void>("start_timer");

// Move state outside component to prevent reset on re-mount
let globalSelectedOption = "A";

function Content() {
  console.log("Content component rendering, globalSelectedOption:", globalSelectedOption);
  
  const [result, setResult] = useState<number | undefined>();
  const [selectedOption, setSelectedOption] = useState<string>(globalSelectedOption);

  console.log("Content state - selectedOption:", selectedOption, "result:", result);

  // Dropdown options for the test
  const dropdownOptions: SingleDropdownOption[] = [
    { data: "A", label: "Option A" },
    { data: "B", label: "Option B" },
    { data: "C", label: "Option C" }
  ];

  const onClick = async () => {
    console.log("Button clicked, calling add function");
    const result = await add(Math.random(), Math.random());
    console.log("Add function result:", result);
    setResult(result);
  };

  const onDropdownChange = (option: SingleDropdownOption) => {
    console.log("=== DROPDOWN CHANGE START ===");
    console.log("Dropdown changing from", selectedOption, "to", option.data);
    console.log("Option object:", option);
    globalSelectedOption = option.data; // Update global state
    console.log("Updated globalSelectedOption to:", globalSelectedOption);
    setSelectedOption(option.data);     // Update component state
    console.log("Called setSelectedOption with:", option.data);
    console.log("=== DROPDOWN CHANGE END ===");
  };

  return (
    <PanelSection title="Panel Section">
      <PanelSectionRow>
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownItem
            label="Dropdown Test"
            description={`Currently selected: ${selectedOption}`}
            rgOptions={dropdownOptions}
            selectedOption={selectedOption}
            onChange={onDropdownChange}
          />
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={onClick}
        >
          {result ?? "Add two numbers via Python"}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={() => startTimer()}
        >
          {"Start Python timer"}
        </ButtonItem>
      </PanelSectionRow>

      {/* <PanelSectionRow>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <img src={logo} />
        </div>
      </PanelSectionRow> */}

      {/*<PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={() => {
            Navigation.Navigate("/decky-plugin-test");
            Navigation.CloseSideMenus();
          }}
        >
          Router
        </ButtonItem>
      </PanelSectionRow>*/}
    </PanelSection>
  );
};

export default definePlugin(() => {
  console.log("Template plugin initializing, this is called once on frontend startup")

  // serverApi.routerHook.addRoute("/decky-plugin-test", DeckyPluginRouterTest, {
  //   exact: true,
  // });

  // Add an event listener to the "timer_event" event from the backend
  const listener = addEventListener<[
    test1: string,
    test2: boolean,
    test3: number
  ]>("timer_event", (test1, test2, test3) => {
    console.log("Template got timer_event with:", test1, test2, test3)
    toaster.toast({
      title: "template got timer_event",
      body: `${test1}, ${test2}, ${test3}`
    });
  });

  return {
    // The name shown in various decky menus
    name: "Test Plugin",
    // The element displayed at the top of your plugin's menu
    titleView: <div className={staticClasses.Title}>Decky Example Plugin</div>,
    // The content of your plugin's menu
    content: <Content />,
    // The icon displayed in the plugin list
    icon: <FaShip />,
    // The function triggered when your plugin unloads
    onDismount() {
      console.log("Unloading")
      removeEventListener("timer_event", listener);
      // serverApi.routerHook.removeRoute("/decky-plugin-test");
    },
  };
});
