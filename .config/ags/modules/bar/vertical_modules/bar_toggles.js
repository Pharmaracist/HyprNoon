import Audio from "resource:///com/github/Aylur/ags/service/audio.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import Mpris from 'resource:///com/github/Aylur/ags/service/mpris.js';
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";

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
              stack.shown = Audio.microphone?.isMuted ? 'true' : 'false';
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
              stack.shown = Audio.speaker?.isMuted ? 'true' : 'false';
            }),
        }),
      ],
    }),
  });

export const PreviousButton = () =>
  Widget.Button({
    onClicked: () => {
      const player = Mpris.getPlayer();
      if (player) {
        player.previous();
      }
    },
    child: MaterialIcon("skip_previous", "norm"),
  });

export const NextButton = () =>
  Widget.Button({
    onClicked: () => {
      const player = Mpris.getPlayer();
      if (player) {
        player.next();
      }
    },
    child: MaterialIcon("skip_next", "norm"),
  });

export const MediaControls = () =>
  Widget.Box({
    className: "bar-button onSurfaceVariant",
    vertical: true,
    spacing: 5,
    hpack: "center",
    hexpand: true,
    setup: (self) => self.on("button-press-event", (_, event) => {
      if (event.get_button()[1] === 3) { // Right click
        App.toggleWindow('music');
        return true;
      }
      return false;
    }),
    children: [
      PreviousButton(),
      Widget.Button({
        onClicked: () => {
          const player = Mpris.getPlayer();
          if (player) {
            player.playPause();
          }
        },
        child: Widget.Box({
          children: [
            Widget.Stack({
              transition: "slide_up_down",
              transitionDuration: userOptions.asyncGet().animations.durationSmall,
              children: {
                true: MaterialIcon("pause", "norm"),
                false: MaterialIcon("play_arrow", "norm"),
              },
              setup: (self) => {
                self.hook(Mpris, (stack) => {
                  const player = Mpris.getPlayer();
                  stack.shown = player?.playBackStatus === 'Playing' ? 'true' : 'false';
                }, 'changed');
              },
            }),
          ],
        }),
      }),
      NextButton(),
    ],
  });

const BarToggles = (props = {}, monitor ) =>
  Widget.Box({
      ...props,
      className: "bar-button onSurfaceVariant",
      vertical:true,
      spacing:5,
      hpack:"center",
      hexpand:true,
      children: [
        SpeakerIndicator(),
        MicIndicator(),
      ],
    });
export default () => BarToggles();
