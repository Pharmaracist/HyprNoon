import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { Tray } from "../modules/tray.js";
import { SaadiBarGroup } from '../../.commonwidgets/bargroup.js';
import { bluetoothPill, NotificationIndicator } from "../../.commonwidgets/statusicons.js";
import Clock from "../modules/clock.js";
import NetworkSpeed from "../../.commonwidgets/networkspeed.js";
import PrayerTimesWidget from "../modules/prayertimes.js";
import NormalOptionalWorkspaces from "../normal/workspaces_hyprland.js";
import SystemResources from "../normal/resources.js";
import BatteryScaleModule from "../modules/battery_scale.js";
import scrolledmodule from "../../.commonwidgets/scrolledmodule.js";
const Power = Widget.Button({
  child: Widget.Label({
    label: "power_settings_new",
    className: "txt-large group-saadi icon-material onSurfaceVariant",
  }),
  onClicked: () => {
    App.toggleWindow('session0');
  }
})

export const SaadiBar = Widget.CenterBox({
  className: "bar-saadi",
  css: `padding:0 2rem`,
  startWidget: Widget.Box({
    spacing: 5,
    children: [
      SaadiBarGroup({ child: Tray() }),
      SaadiBarGroup({ child: NetworkSpeed() }),
      SaadiBarGroup({ child: BatteryScaleModule() })
    ]
  }),
  centerWidget: Widget.Button({
    hpack: 'center',
    child: Widget.Box({
      className: "group-saadi",
      children: [
        NotificationIndicator(),
        Clock(),
      ],
    }),
    onClicked: () => {
      App.toggleWindow('sideright')
    }
  }),
  endWidget: Widget.Box({
    children: [
      Widget.Box({
        hexpand: true,
        hpack: 'end',
        children: [
          userOptions.asyncGet().muslim.enabled ? scrolledmodule({
            children: [SaadiBarGroup({ child: PrayerTimesWidget() }), SaadiBarGroup({ child: PrayerTimesWidget() })],
          }) : SaadiBarGroup({ child: PrayerTimesWidget() }),
        ]
      }),
      SaadiBarGroup({ child: SystemResources() }),
      SaadiBarGroup({ child: await NormalOptionalWorkspaces() }),
      SaadiBarGroup({ child: bluetoothPill() }),
      Power
    ]
  }),
});
