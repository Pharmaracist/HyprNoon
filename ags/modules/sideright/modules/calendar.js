const { Gio, GLib } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
const { Box, Button, Label, Overlay } = Widget;
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
import { setupCursorHover } from "../../.widgetutils/cursorhover.js";
import { TimerWidget } from "./timers.js";
import { TodoWidget } from "./todolist.js";
import { getCalendarLayout } from "./calendar_layout.js";
import AudioFiles from "./media.js";
import { PrayerTimesWidget } from "../prayertimes.js";
import Todo from "../../../services/todo.js";

// Use the same userOpts variable as before
let userOpts = userOptions.asyncGet();

// Cached calendar values
let calendarJson = getCalendarLayout(undefined, true);
let monthshift = 0;

// Optimized function to get the date shifted by x months
function getDateInXMonthsTime(x) {
  const currentDate = new Date();
  let targetMonth = currentDate.getMonth() + x;
  let targetYear = currentDate.getFullYear();
  targetYear += Math.floor(targetMonth / 12);
  targetMonth = ((targetMonth % 12) + 12) % 12;
  return new Date(targetYear, targetMonth, 1);
}

const weekDays = (() => {
  const currentDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const adjustedCurrentDay = currentDay === 0 ? 6 : currentDay - 1; // Adjust so Monday is index 0
  return [
    { day: getString("Mo"), today: adjustedCurrentDay === 0 ? 1 : 0 },
    { day: getString("Tu"), today: adjustedCurrentDay === 1 ? 1 : 0 },
    { day: getString("We"), today: adjustedCurrentDay === 2 ? 1 : 0 },
    { day: getString("Th"), today: adjustedCurrentDay === 3 ? 1 : 0 },
    { day: getString("Fr"), today: adjustedCurrentDay === 4 ? 1 : 0 },
    { day: getString("Sa"), today: adjustedCurrentDay === 5 ? 1 : 0 },
    { day: getString("Su"), today: adjustedCurrentDay === 6 ? 1 : 0 },
  ];
})();

// Calendar day component (with cleanup on destroy)
const CalendarDay = (day, today) =>
  Button({
    className: `sidebar-calendar-btn ${
      today == 1
        ? "sidebar-calendar-btn-today"
        : today == -1
        ? "sidebar-calendar-btn-othermonth"
        : ""
    }`,
    child: Overlay({
      child: Box({}),
      overlays: [
        Label({
          hpack: "center",
          className: "txt-smallie txt-semibold sidebar-calendar-btn-txt",
          label: String(day),
        }),
      ],
    }),
    setup: (self) => {
      self.connect("destroy", () => {
        self.disconnect_by_func("clicked");
      });
    },
  });

// Calendar widget
const CalendarWidget = () => {
  const calendarMonthYear = Button({
    className: "txt txt-large sidebar-calendar-monthyear-btn",
    onClicked: () => shiftCalendarXMonths(0),
    setup: (button) => {
      button.label = `${new Date().toLocaleString("default", {
        month: "long",
      })} ${new Date().getFullYear()}`;
      setupCursorHover(button);
    },
  });

  const addCalendarChildren = (box, calendarJson) => {
    box.get_children().forEach((child) => child.destroy());
    box.children = calendarJson.map((row) =>
      Box({
        className: "spacing-h-5",
        children: row.map((day) => CalendarDay(day.day, day.today)),
      })
    );
  };

  function shiftCalendarXMonths(x) {
    monthshift = x == 0 ? 0 : monthshift + x;
    const newDate =
      monthshift == 0 ? new Date() : getDateInXMonthsTime(monthshift);
    calendarJson = getCalendarLayout(newDate, monthshift == 0);
    calendarMonthYear.label = `${
      monthshift == 0 ? "" : "• "
    }${newDate.toLocaleString("default", {
      month: "long",
    })} ${newDate.getFullYear()}`;
    addCalendarChildren(calendarDays, calendarJson);
  }

  const calendarHeader = Box({
    className: "spacing-h-5 sidebar-calendar-header",
    setup: (box) => {
      box.pack_start(calendarMonthYear, false, false, 0);
      box.pack_end(
        Box({
          className: "spacing-h-5",
          children: [
            Button({
              className: "sidebar-calendar-monthshift-btn",
              onClicked: () => shiftCalendarXMonths(-1),
              child: MaterialIcon("chevron_left", "norm"),
              setup: setupCursorHover,
            }),
            Button({
              className: "sidebar-calendar-monthshift-btn",
              onClicked: () => shiftCalendarXMonths(1),
              child: MaterialIcon("chevron_right", "norm"),
              setup: setupCursorHover,
            }),
          ],
        }),
        false,
        false,
        0
      );
    },
  });

  const calendarDays = Box({
    hexpand: true,
    vertical: true,
    className: "spacing-v-5",
    setup: (self) => {
      self.connect("destroy", () => {
        self.get_children().forEach((child) => {
          if (child.destroy) child.destroy();
        });
      });
      addCalendarChildren(self, calendarJson);
    },
  });

  return Widget.EventBox({
    onScrollUp: () => shiftCalendarXMonths(-1),
    onScrollDown: () => shiftCalendarXMonths(1),
    child: Box({
      hpack: "center",
      children: [
        Box({
          hexpand: true,
          vertical: true,
          className: "spacing-v-5",
          children: [
            calendarHeader,
            Box({
              homogeneous: true,
              className: "spacing-h-5",
              children: weekDays.map((day) => CalendarDay(day.day, day.today)),
            }),
            calendarDays,
          ],
        }),
      ],
    }),
  });
};

// Define StackButton (for the navrail)
const StackButton = (stackItemName, icon, name) =>
  Button({
    className: "button-minsize sidebar-navrail-btn txt-small spacing-h-5",
    onClicked: (button) => {
      contentStack.shown = stackItemName;
      button
        .get_parent()
        .get_children()
        .forEach((kid) => {
          kid.toggleClassName("sidebar-navrail-btn-active", kid === button);
        });
    },
    child: Box({
      className: "spacing-v-5",
      vertical: true,
      children: [
        Label({
          className: "txt icon-material txt-hugeass",
          label: icon,
        }),
        Label({
          label: name,
          className: "txt txt-smallie",
        }),
      ],
    }),
    setup: (button) =>
      Utils.timeout(1, () => {
        setupCursorHover(button);
        button.toggleClassName(
          "sidebar-navrail-btn-active",
          defaultShown === stackItemName
        );
      }),
  });

// Content stack with various modules
const defaultShown = userOpts.muslim?.enabled ? "PrayerTimes" : "calendar";
const contentStack = Widget.Stack({
  hexpand: true,
  vexpand: false,
  homogeneous: true,
  children: {
    ...(userOpts.muslim?.enabled ? { PrayerTimes: PrayerTimesWidget() } : {}),
    calendar: CalendarWidget(),
    todo: TodoWidget(),
    media: AudioFiles(),
    timers: TimerWidget(),
  },
  transition: "slide_up_down",
  transitionDuration: userOpts.animations.durationLarge,
  setup: (stack) => {
    Utils.timeout(1, () => (stack.shown = defaultShown));
    userOptions.subscribe((newOpts) => {
      userOpts = newOpts;
      if (!newOpts.muslim?.enabled && stack.shown === "PrayerTimes") {
        stack.shown = "calendar";
      }
    });
  },
});

// Create navrail using StackButtons
const navrail = Box({
  vpack: "center",
  vertical: true,
  className: "sidebar-navrail spacing-v-10",
  children: [
    ...(userOpts.muslim?.enabled
      ? [StackButton("PrayerTimes", "mosque", getString("Prayers"))]
      : []),
    StackButton("calendar", "calendar_month", getString("Calendar")),
    StackButton("todo", "done_outline", getString("To Do")),
    StackButton("media", "music_note", getString("Media")),
    StackButton("timers", "access_time", getString("Timers")),
  ],
});

// --- COLLAPSE/EXPAND FEATURE --- //

// Helper for collapse button icon (toggled based on collapse state)
const CollapseButtonIcon = (collapse) =>
  MaterialIcon(collapse ? "expand_more" : "expand_less", "norm");

// Collapse button component
const CollapseButton = (collapse) =>
  Button({
    hpack: "start",
    vpack: "start",
    className: "margin-top-5 margin-left-5 margin-bottom-5",
    onClicked: () => {
      mainStack.shown =
        mainStack.shown === "expanded" ? "collapsed" : "expanded";
    },
    setup: setupCursorHover,
    child: Box({
      className: "sidebar-calendar-btn-arrow txt",
      homogeneous: true,
      children: [CollapseButtonIcon(collapse)],
    }),
    tooltipText: collapse
      ? getString("Collapse calendar")
      : getString("Expand calendar"),
  });

// Variable for dynamic date (ensure Variable is available in your environment)
const date = Variable("", {
  poll: [
    userOpts.time.interval,
    () => GLib.DateTime.new_now_local().format(userOpts.time.dateFormatLong),
  ],
});

// Collapsed view widget (summary)
const collapsedWidget = Box({
  className: "spacing-h-5",
  vpack: "center",
  hexpand: true,
  children: [
    CollapseButton(false),
    Label({
      hpack: "start",
      className: "txt txt-small sidebar-calendar-collapsed-pill",
      label: date.bind(),
    }),
    Box({ hexpand: true }),
    Label({
      hpack: "end",
      className: "txt txt-small sidebar-calendar-collapsed-pill",
      label: `${Todo.todo_json.length} ${getString("To do tasks")}`,
      setup: (self) =>
        self.hook(Todo, (self) => {
          self.label = `${Todo.todo_json.length} ${getString("To do tasks")}`;
        }),
    }),
  ],
});

// Expanded view widget wrapping the navrail (with collapse button overlay) and the contentStack
const expandedWidget = Box({
  className: "spacing-h-5",
  hexpand: true,
  children: [
    Overlay({
      child: navrail,
      overlays: [CollapseButton(true)],
    }),
    contentStack,
  ],
});

// Main stack toggling between "collapsed" and "expanded" views
const mainStack = Widget.Stack({
  className: "sidebar-group",
  homogeneous: false,
  hexpand: true,
  children: {
    collapsed: collapsedWidget,
    expanded: expandedWidget,
  },
  transition: "slide_up_down",
  transitionDuration: userOpts.animations.durationHuge,
  setup: (stack) =>
    Utils.timeout(1, () => {
      stack.shown = userOpts.sidebar.ModuleCalendar.visible
        ? "expanded"
        : "collapsed";
    }),
});

// Export the module
export const ModuleCalendar = () => mainStack;
