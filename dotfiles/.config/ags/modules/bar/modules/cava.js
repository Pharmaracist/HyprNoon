import Widget from 'resource:///com/github/Aylur/ags/widget.js'
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js'
import cava from "../../../services/cava.js"

const TRANSITION_DURATION = 50

export default () => {
    // Create the visualization widget
    const visualizer = Widget.Box({
        class_name: 'cava-visualizer',
        spacing: 2,
        css: 'min-width: 20rem;'
    })

    // Update the widget with the latest cava output
    const updateWidget = () => {
        const output = cava.output
        if (!output) return

        // Analyze the output to determine thresholds dynamically
        const chars = output.split('')
        const charCodes = chars.map(char => char.charCodeAt(0) - 9601)
        const maxHeight = Math.max(...charCodes)
        const highThreshold = maxHeight * 0.7  // 70% of max height is considered high
        const medThreshold = maxHeight * 0.4   // 40% of max height is considered medium

        // Create bar widgets with dynamic classes and colors
        const bars = chars.map(char => {
            const height = char.charCodeAt(0) - 9601
            let intensityClass = 'cava-bar-low'
            if (height >= highThreshold) intensityClass = 'cava-bar-high'
            else if (height >= medThreshold) intensityClass = 'cava-bar-med'
            
            return Widget.Label({
                label: char,
                class_name: `cava-bar ${intensityClass}`,
                css: `
                    margin: 0 1px;
                    font-size: 1.1em;
                    transition: all ${TRANSITION_DURATION}ms cubic-bezier(0.45, 0.05, 0.55, 0.95);
                    color: ${height === 0 ? 'transparent' : 'inherit'};
                `
            })
        })

        visualizer.children = bars
    }

    // Create the container with a modern look
    return Widget.Box({
        class_name: 'cava-module',
        css: 'padding: 0 3px;',
        child: Widget.Box({
            class_name: 'cava-container',
            child: visualizer,
        }),
        setup: self => {
            // Initial update
            updateWidget()
            
            // Update on cava output changes
            self.hook(cava, () => {
                updateWidget()
            }, 'output-changed')
        }
    })
}