import Audio from "resource:///com/github/Aylur/ags/service/audio.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
// import { languages } from "../../.commonwidgets/statusicons_languages.js";
const { GLib } = imports.gi;

export const MicIndicator = () =>
  Widget.Button({
    onClicked: () => {
      if (Audio.microphone)
        Audio.microphone.isMuted = !Audio.microphone.isMuted;
    },
    child: Widget.Box({
      children: [
        Widget.Stack({
          transition: "slide_up_down",
          transitionDuration: userOptions.asyncGet().animations.durationSmall,
          children: {
            true: MaterialIcon("mic_off", "norm"),
            false: MaterialIcon("mic", "norm"),
          },
          setup: (self) =>
            self.hook(Audio, (stack) => {
              if (!Audio.microphone) return;
              stack.shown = String(Audio.microphone.isMuted);
            }),
        }),
      ],
    }),
  });

export const SpeakerIndicator = () =>
  Widget.Button({
    onClicked: () => {
      if (Audio.speaker) Audio.speaker.isMuted = !Audio.speaker.isMuted;
    },
    child: Widget.Box({
      children: [
        Widget.Stack({
          transition: "slide_up_down",
          transitionDuration: userOptions.asyncGet().animations.durationSmall,
          children: {
            true: MaterialIcon("volume_off", "norm"),
            false: MaterialIcon("volume_up", "norm"),
          },
          setup: (self) =>
            self.hook(Audio, (stack) => {
              if (!Audio.speaker) return;
              stack.shown = String(Audio.speaker.isMuted);
            }),
        }),
      ],
    }),
  });

 const BarToggles = (props = {}, monitor = 0) =>
  Widget.Box({
    ...props,
    child: Widget.Box({
      className: "bar-button",
      children: [
        Widget.Box({
          className: "spacing-h-10 sec-txt ",
          children: [
            MicIndicator(),
            SpeakerIndicator(),
          ],
        }),
      ],
    }),
  });
export default () => BarToggles();