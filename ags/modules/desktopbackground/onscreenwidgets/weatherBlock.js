import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
import WeatherService from "../../../services/weather.js";

const { Box, Label, Overlay, Icon } = Widget;

// Create a weather icon using the MaterialIcon mechanism
const weatherIcon = Label({
    className: 'icon-material onSurface-variant add-weather-icon-bg',
    label: 'device_thermostat',

})

// Temperature label hooked to WeatherService
const tempLabel = Label({
    xalign: 0,
    className: "add-weather-temp-label",
    setup: self => self.hook(WeatherService, () => {
        self.label = WeatherService.temperature;
    })
});

// "Feels like" label hooked to WeatherService
const feelsLikeLabel = Label({
    xalign: 0,
    opacity: 0.5,
    className: "add-weather-feels-label",
    setup: self => self.hook(WeatherService, () => {
        self.label = `Feels Like ${WeatherService.feelsLike}`;
    })
});

let bg = Overlay({
    child: Icon({
        className: 'add-weather-bg'
    }),
    overlays: [weatherIcon],
});

let frontCard = Overlay({
    child: bg,
    overlays: [
        Box({
            vertical: true,
            hpack: 'start',
            vpack: 'end',
            css: 'margin:1rem',
            children: [
                tempLabel,
                feelsLikeLabel
            ]
        })
    ]
});

// WeatherBlock widget that sets up the weather icon and tooltip using WeatherService
const WeatherBlock = () => Box({
    css: `margin:2.5rem 0 0 0`,
    children: [
        frontCard
    ],
    setup: self => self.hook(WeatherService, () => {
        weatherIcon.label = WeatherService.icon;
        self.tooltipText = `${WeatherService.description}\nFeels like ${WeatherService.feelsLike}`;
    })
});

export default WeatherBlock;
