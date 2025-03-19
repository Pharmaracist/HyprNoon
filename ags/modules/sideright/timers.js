import Widget from "resource:///com/github/Aylur/ags/widget.js";
const { Box, Button, Label, Entry, Revealer, Scrollable } = Widget;
import { MaterialIcon } from "../.commonwidgets/materialicon.js";
import { setupCursorHover } from "../.widgetutils/cursorhover.js";
import timers from "../../services/timers.js";
import { execAsync } from "resource:///com/github/Aylur/ags/utils.js";

const options = userOptions.asyncGet();
const PRESET_TIMERS = options.timers.presets.map((preset) => ({
  name: preset.name,
  duration: preset.duration,
  icon: preset.icon || "timer",
  tooltip: `${preset.name}: ${Math.floor(preset.duration / 60)} minutes`,
}));

const ANIMATION_DURATION = options.animations.durationSmall;

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const getEndTime = (remainingSeconds) => {
  const now = new Date();
  const endTime = new Date(now.getTime() + remainingSeconds * 1000);
  return endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const TimerItem = (timer) => {
  let timerConnections = [];
  
  const timerBox = Box({
    css: "font-size:1.1rem",
    className: "spacing-h-5 sidebar-timer-item",
  });

  const notifyComplete = () => {
    execAsync([
      "notify-send",
      `Timer Complete`,
      `${timer.name} timer has finished!`,
    ]);
    execAsync(["paplay", "/usr/share/sounds/freedesktop/stereo/complete.oga"]);
  };

  const updateButtonState = (running) => {
    startBtn.child = MaterialIcon(running ? "pause" : "play_arrow", "norm", {
      className: "sidebar-timer-icon",
    });
  };

  const cleanup = () => {
    timerConnections.forEach(id => timers.disconnect(id));
    timerConnections = [];
  };

  // Add cleanup when widget is destroyed
  timerBox.connect('destroy', cleanup);

  const timeLabel = Label({
    className: "txt-small",
    label: formatTime(timer.remaining),
  });

  const endTimeLabel = Label({
    className: "txt-smallie txt-subtext",
    label: getEndTime(timer.remaining),
  });

  const startBtn = Button({
    className: "sidebar-timer-btn sidebar-timer-btn-start",
    child: MaterialIcon(timer.running ? "pause" : "play_arrow", "norm", {
      className: "sidebar-timer-icon",
    }),
    setup: setupCursorHover,
    onClicked: () => {
      if (timer.running) {
        timers.stopTimer(timer.id);
      } else {
        timers.startTimer(timer.id);
      }
    },
  });

  const resetBtn = Button({
    className: "sidebar-timer-btn sidebar-timer-btn-start",
    child: MaterialIcon("restart_alt", "norm", {
      className: "sidebar-timer-icon",
    }),
    setup: setupCursorHover,
    onClicked: () => timers.resetTimer(timer.id),
  });

  const deleteBtn = Button({
    className: "sidebar-timer-delete",
    child: MaterialIcon("delete", "norm", { className: "sidebar-timer-icon" }),
    setup: setupCursorHover,
    onClicked: () => timers.removeTimer(timer.id),
  });

  const controls = Box({
    className: "spacing-h-5",
    children: [startBtn, resetBtn, deleteBtn],
  });

  const timerContent = Box({
    className: "spacing-h-10",
    hexpand: true,
    children: [
      Box({
        vertical: true,
        children: [
          Box({
            className: "spacing-h-5",
            children: [
              Label({
                xalign: 0,
                hexpand: true,
                className: "txt-smallie",
                label: timer.name,
              }),
              timeLabel,
            ],
          }),
          endTimeLabel,
        ],
      }),
      controls,
    ],
  });

  timerBox.child = timerContent;

  // Update labels when timer ticks
  timerConnections.push(timers.connect('timer-tick', (_, name, remaining) => {
    if (name === timer.name) {
      timeLabel.label = formatTime(remaining);
      endTimeLabel.label = getEndTime(remaining);
    }
  }));

  // Update button state when timer starts/stops
  timerConnections.push(timers.connect('updated', () => {
    const updatedTimer = timers.getTimer(timer.id);
    if (updatedTimer) {
      updateButtonState(updatedTimer.running);
    }
  }));

  // Check if timer just finished
  if (timer.remaining === 0 && !timer.notified) {
    notifyComplete();
    timer.notified = true;
  }

  return timerBox;
};

const TimersList = () =>
  Box({
    vertical: true,
    className: "spacing-v-5 txt-norm",
    setup: (self) => {
      self.hook(
        timers,
        () => {
          self.children = timers.timers.map((timer) => TimerItem(timer));
        },
        "updated",
      );
    },
  });

export const TimerWidget = () => {
  const timersList = TimersList();

  const header = Box({
    css: "margin-top:0.4rem",
    className: "spacing-h-5",
    children: [
      Label({
        hexpand: true,
        xalign: 0,
        className: "txt txt-large txt-bold",
        label: "Timers",
      }),
    ],
  });

  const scrollArea = Scrollable({
    vexpand: true,
    child: timersList,
    setup: (scrollable) => {
      const vScrollbar = scrollable.get_vscrollbar();
      vScrollbar.get_style_context().add_class("sidebar-scrollbar");
    },
  });

  const presetButtons = Box({
    className: "sidebar-timer-presets",
    children: [
      Box({
        hexpand: true,
        child: Scrollable({
          hexpand: true,
          hscroll: "always",
          vscroll: "never",
          child: Box({
            hexpand: true,
            className: "spacing-h-5",
            children: PRESET_TIMERS.map((preset) =>
              Button({
                className: "sidebar-timer-btn sidebar-timer-btn-start",
                tooltipText: preset.tooltip,
                child: MaterialIcon(preset.icon, "norm", {
                  className: "sidebar-timer-icon",
                }),
                setup: setupCursorHover,
                onClicked: () => {
                  const name = preset.name;
                  const duration = preset.duration;
                  timers.addTimer(name, duration);
                },
              }),
            ),
          }),
        }),
      }),
    ],
  });

  const widget = Box({
    vertical: true,
    className: 'timer-widget',
    setup: (self) => {
      // Cleanup handler for widget destruction
      self.connect('destroy', () => {
        self.get_children().forEach(child => {
          if (child.destroy) child.destroy();
        });
      });

      // Connect to timers service
      const updateHandler = timers.connect('changed', () => {
        updateTimersList(self);
      });

      self.connect('destroy', () => {
        timers.disconnect(updateHandler);
      });
    },
    children: [
      header,
      scrollArea,
      Box({
        // Separator
        className: "txt-subtext txt-small",
        hpack: "center",
        child: Label({
          label: "Quick Presets",
        }),
      }),
      presetButtons,
    ],
  });

  return widget;
};
