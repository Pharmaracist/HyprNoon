import App from "resource:///com/github/Aylur/ags/app.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
const { Box, Window } = Widget;

export default ({
  name,
  child,
  showClassName = "",
  hideClassName = "",
  ...props
}) => {
  return Window({
    name,
    visible: false,
    layer: "top",
    ...props,
    child: Box({
      setup: (self) => {
        self.keybind("Escape", () => {
          Promise.resolve(closeEverything()).catch((err) => {
            logError(err, "Error closing popup window");
          });
        });
        if (showClassName && hideClassName) {
          self.hook(App, (self, currentName, visible) => {
            if (currentName === name) {
              self.toggleClassName(hideClassName, !visible);
            }
          });
          self.className = `${showClassName} ${hideClassName}`;
        }
      },
      child: child,
    }),
  });
};
