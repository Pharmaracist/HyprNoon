import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
const { GLib } = imports.gi;

const { Box, Label } = Widget;

// Function to fetch power draw asynchronously
const fetchPowerDraw = async () => {
  try {
    const current = parseInt(
      await Utils.execAsync("cat /sys/class/power_supply/BAT0/current_now"),
      10,
    ); // Current in µA
    const voltage = parseInt(
      await Utils.execAsync("cat /sys/class/power_supply/BAT0/voltage_now"),
      10,
    ); // Voltage in µV

    // Convert to base units (A, V)
    const currentInAmps = current / 1000000; // Convert µA to A
    const voltageInVolts = voltage / 1000000; // Convert µV to V

    // Calculate power in watts (W = A * V)
    const powerInWatts = (currentInAmps * voltageInVolts).toFixed(2);
    return `${powerInWatts} W`;
  } catch (err) {
    console.error("Error fetching power draw:", err);
    return "N/A";
  }
};

// Create the Power Draw widget
const PowerDrawWidget = () => {
  const label = Label({
    className: "power-draw-text",
    label: "Fetching...",
  });

  // Periodic update function
  const updatePowerDraw = async () => {
    const power = await fetchPowerDraw();
    label.label = power;
  };

  // Set an interval to update the label
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
    updatePowerDraw();
    return true; // Ensures the timeout repeats
  });

  // Initial fetch
  updatePowerDraw();

  return Widget.Box({
    className: "power-draw-widget bar-util", // Added class name to the Box widget
    children: [label],
  });
};

export default PowerDrawWidget;
