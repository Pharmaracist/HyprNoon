import Widget from "resource:///com/github/Aylur/ags/widget.js";
// import { RevealerState } from "./revealercontrol.js";
import App from "resource:///com/github/Aylur/ags/app.js";

export const BarButton = () => {
  const button = Widget.EventBox({
    className: "txt-hugerass icon-nerd sec-txt",
    vpack: "center",
    child: Widget.Label({
      label: " \ue732 ",
    }),
    onPrimaryClick: () => {
      App.toggleWindow("sideleft");
      // RevealerState.toggleAll();
    },
    onSecondaryClick: () => {
      openWindowOnAllMonitors('session')
      },
  });

  // Update button state when revealers change
  // button.hook(RevealerState, () => {
  //   button.child.label = RevealerState.isRevealed ? " \ue731 " : " \ue732 ";
  // }, 'changed');

  return button;
};
