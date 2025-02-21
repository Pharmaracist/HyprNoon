import Widget from "resource:///com/github/Aylur/ags/widget.js";
import Mpris from "resource:///com/github/Aylur/ags/service/mpris.js";
import Bluetooth from "resource:///com/github/Aylur/ags/service/bluetooth.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import Glib from 'gi://GLib';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import cava from "../../services/cava.js";
const COVER_FALLBACK = userOptions.asyncGet().ipod.coverArt.fallbackIcon;
const getPlayer = () =>
  Mpris.players.find((p) => p.trackTitle) || Mpris.getPlayer("");

let showBackground = userOptions.asyncGet().ipod.background.enableBlur;  // Initialize based on enableBlur setting
let mainWidget = null;
let currentBlurredPath = null;  // Move to global scope to share between functions
let lastCoverPath = null;  // Track last cover path
let backgroundLayer = null;

const toggleBackground = () => {
  if (!userOptions.asyncGet().ipod.background.enableBlur) {
    showBackground = false;
  } else {
    showBackground = !showBackground;
  }
  
  if (backgroundLayer) {
    if (showBackground && currentBlurredPath && userOptions.asyncGet().ipod.background.enableBlur) {
      backgroundLayer.css = `
        min-height: ${userOptions.asyncGet().ipod.widget.minHeight}px;
        border-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
        -gtk-outline-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
        background: linear-gradient(rgba(0, 0, 0, ${userOptions.asyncGet().ipod.background.defaultOpacity}), 
          rgba(0, 0, 0, ${userOptions.asyncGet().ipod.background.defaultOpacity})), 
          url('${currentBlurredPath}');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        transition: all ${userOptions.asyncGet().ipod.background.transitionMs}ms ease;
      `;
    } else {
      // Set to transparent when disabled
      backgroundLayer.css = `
        min-height: ${userOptions.asyncGet().ipod.widget.minHeight}px;
        border-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
        -gtk-outline-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
        background-color:@theme_bg_color ;

        transition: all ${userOptions.asyncGet().ipod.background.transitionMs}ms ease;
      `;
    }
  }
};

// const BluetoothIndicator = () =>
//   Widget.Box({
//     className: "bluetooth-indicator media-controls-container spacing-h-5",
//     setup: (self) =>
//       self.hook(Bluetooth, () => {
//         const audioDevices = Bluetooth.connected_devices.filter(
//           (device) =>
//             device.iconName?.includes("audio") ||
//             device.iconName?.includes("headphone") ||
//             device.iconName?.includes("headset")
//         );
//         self.children = audioDevices.map((device) =>
//           Widget.Box({
//             className: "bluetooth-device spacing-h-5",
//             vpack: "center",
//             tooltipText: device.name,
//             children: [
//               Widget.Icon({
//                 className: "bluetooth-icon",
//                 icon: `${device.iconName}-symbolic`,
//                 size: 24,
//               }),
//               ...(device.batteryPercentage
//                 ? [
//                     Widget.Label({
//                       className: "bluetooth-battery txt-norm",
//                       label: `${device.batteryPercentage}%`,
//                     }),
//                   ]
//                 : []),
//             ],
//           })
//         );
//         self.visible = audioDevices.length > 0;
//       }),
//   });

// const VolumeIndicator = () => {
//   const icon = Widget.Icon({
//     // className: "app-icon",
//     size: userOptions.asyncGet().ipod.volume.iconSize,
//     setup: (self) =>
//       self.hook(Mpris, () => {
//         const player = getPlayer();
//         self.visible = !!player;
//         self.icon_name = player?.busName?.includes("spotify")
//           ? "spotify-client"
//           : player?.busName?.includes("mpv")
//           ? "mpv"
//           : player?.busName?.includes("chromium")
//           ? "youtube-music"
//           : player?.busName?.includes("amberol")
//           ? "io.bassi.Amberol"
//           : COVER_FALLBACK;
//       }),
//   });


//   return Widget.EventBox({
//     // onScrollUp: () => handleScroll(1),
//     // onScrollDown: () => handleScroll(-1),//TODO
//     child: Widget.Box({
//       className: "spacing-h-4 txt-small onSurfaceVariant",
//       children: [
//         Widget.Box({
//           homogeneous: true,
//           children: [
//             // Widget.Box({
//             //   className: "volume-icon",
//             //   homogeneous: true,
//             //   child: Widget.Overlay({
//             //     child: icon,
//             //     overlays: [circprog],
//             //   }),
//             //   setup: (self) =>
//             //     self.hook(Audio, () => {
//             //       const vol = Math.round(Audio.speaker?.volume * 100);
//             //       circprog.css = `font-size: ${vol}px;`;
//             //     }),
//             // }),
//           ],
//         }),
//         Widget.Label({
//           className: "txt-norm",
//           setup: (self) =>
//             self.hook(
//               Audio,
//               () => (self.label = `${Math.round(Audio.speaker?.volume * 100)}%`)
//             ),
//         }),
//         BluetoothIndicator(),
//       ],
//     }),
//   });
// };

const MediaControls = () => {
  const playButton = Widget.Button({
    className: "control-button",
    css: `font-size: ${userOptions.asyncGet().ipod.controls.buttonSize};`,
    child: Widget.Box({
      className: "play-button-container",
      homogeneous: true,
      child: Widget.Label({
        label: "󰐊",
        setup: (self) => {
          const update = () => {
            const player = getPlayer();
            self.label = player?.playBackStatus === "Playing" ? '󰏤' : '󰐊';
          };
          self.hook(Mpris, update, 'player-changed');
            update();
          },
      }),
    }),
    onClicked: () => {
      const player = getPlayer();
      if (!player) return;
      player.playPause();
    },
  });

  const shuffleButton = Widget.Button({
    className: "control-button",
    css: `font-size: ${userOptions.asyncGet().ipod.controls.otherButtonSize};`,
    child: Widget.Label({
      label: "󰒟",
    }),
    setup: self => self.hook(Mpris, () => {
      const player = getPlayer();
      if (!player) return;
      self.toggleClassName('active', player.shuffleStatus);
    }),
    onClicked: () => {
      const player = getPlayer();
      if (!player) return;
      
      const newState = !player.shuffleStatus;
      
      try {
        Utils.execAsync(['dbus-send', '--print-reply', '--dest=org.mpris.MediaPlayer2.spotify', 
          '/org/mpris/MediaPlayer2', 'org.freedesktop.DBus.Properties.Set',
          'string:org.mpris.MediaPlayer2.Player',
          'string:Shuffle',
          `variant:boolean:${newState}`]).catch(e => {});
        
        shuffleButton.toggleClassName('active', newState);
      } catch (e) {}
    },
  });

  const prevNextButtons = ["󰒮", "󰒭"].map(icon => Widget.Button({
    className: "control-button",
    css: `font-size: ${userOptions.asyncGet().ipod.controls.otherButtonSize};`,
    child: Widget.Label({ label: icon }),
    onClicked: () => icon === "󰒮" ? getPlayer()?.previous() : getPlayer()?.next(),
  }));

  const loopButton = Widget.Button({
    className: "control-button",
    css: `font-size: ${userOptions.asyncGet().ipod.controls.otherButtonSize};`,
    child: Widget.Label({
      label: "󰑖",
    }),
    setup: self => self.hook(Mpris, () => {
      const player = getPlayer();
      if (!player) return;
      
      const status = player.loopStatus || 'None';
      self.child.label = status === 'None' ? '󰑖' : 
                        status === 'Track' ? '󰑘' : '󰑖';
      self.toggleClassName('active', status !== 'None');
    }),
    onClicked: () => {
      const player = getPlayer();
      if (!player) return;
      
      const currentStatus = player.loopStatus || 'None';
      let newStatus;
      switch (currentStatus) {
        case 'None':
          newStatus = 'Track';
          break;
        case 'Track':
          newStatus = 'Playlist';
          break;
        default:
          newStatus = 'None';
      }
      
      try {
        Utils.execAsync(['dbus-send', '--print-reply', '--dest=org.mpris.MediaPlayer2.spotify',
          '/org/mpris/MediaPlayer2', 'org.freedesktop.DBus.Properties.Set',
          'string:org.mpris.MediaPlayer2.Player',
          'string:LoopStatus',
          `variant:string:${newStatus}`]).catch(e => {});
        
        loopButton.child.label = newStatus === 'None' ? '󰑖' : 
                                newStatus === 'Track' ? '󰑘' : '󰑖';
        loopButton.toggleClassName('active', newStatus !== 'None');
      } catch (e) {}
    },
  });

  const wallpaperButton = Widget.Button({
    className: "control-button",
    css: `font-size: ${userOptions.asyncGet().ipod.controls.otherButtonSize};`,
    child: Widget.Label({
      label: showBackground ? "󰈈" : "󰈉",
    }),
    onClicked: () => {
      toggleBackground();
      wallpaperButton.child.label = showBackground
        ? "󰈈"
        : "󰈉";
    },
  });

  return Widget.Box({
    className: "controls-container",
    children: [
      shuffleButton,
      ...prevNextButtons,
      playButton,
      loopButton,
      userOptions.asyncGet().ipod.background.enableBlur ? wallpaperButton : null,
    ].filter(Boolean),
  });
};

const TrackLabels = () =>
  Widget.Box({
    vertical: true,
    vpack: "center",
    hexpand: true,
    className: "track-info",
    setup: (self) => {
      const marginHook = self.hook(Mpris, () => {
        const player = getPlayer();
        self.css = !!(player && player.playBackStatus) ? "" : "margin-left: 1rem;";
      });

      self.connect('destroy', () => self.unhook(marginHook));
      self.connect('unrealize', () => self.unhook(marginHook));
    },
    children: [
      Widget.Label({
        className: "track-title",
        xalign: 0,
        justification: "left",
        truncate: "end",
        maxWidthChars: userOptions.asyncGet().ipod.trackInfo.maxChars,
        css: `
          font-size: ${userOptions.asyncGet().ipod.trackInfo.titleSize}; 
          opacity: ${userOptions.asyncGet().ipod.trackInfo.titleOpacity};
        `,
        setup: (self) => self.hook(Mpris, () => {
          const player = getPlayer();
          self.label = player?.trackTitle || "No media playing";
        }),
      }),
      Widget.Label({
        className: "track-artist",
        xalign: 0,
        justification: "left",
        truncate: "end",
        maxWidthChars: userOptions.asyncGet().ipod.trackInfo.maxChars,
        css: `
          font-size: ${userOptions.asyncGet().ipod.trackInfo.artistSize}; 
          opacity: ${userOptions.asyncGet().ipod.trackInfo.artistOpacity};
        `,
        setup: (self) => self.hook(Mpris, () => {
          const player = getPlayer();
          self.label = player?.trackArtists?.join(", ") || "";
        }),
      }),
    ],
  });

const CavaVisualizer = () => {
  // Reduce to 40 bars for better performance
  const bars = Array(userOptions.asyncGet().ipod.visualizer.barNumber)
    .fill(0)
    .map(() =>
      Widget.Box({
        className: "cava-bar cava-bar-low", // Set initial class
        hpack: "center",
        vpack: `${userOptions.asyncGet().ipod.visualizer.mode}`,
        hexpand: true,
        css: `min-width: ${userOptions.asyncGet().ipod.visualizer.barMinWidth}px;`,
      })
    );

  // Cache for character calculations
  const heightCache = new Map();
  const halfBars = bars.length / 2;
  const heightMultiplier = userOptions.asyncGet().ipod.visualizer.heightMultiplier;
  const maxHeight = userOptions.asyncGet().ipod.visualizer.barMaxHeight;
  const transitionMs = userOptions.asyncGet().ipod.visualizer.transitionMs;
  const barMinWidth = userOptions.asyncGet().ipod.visualizer.barMinWidth;
  const thresholdMed = userOptions.asyncGet().ipod.visualizer.colors.heightThresholds.medium;
  const thresholdHigh = userOptions.asyncGet().ipod.visualizer.colors.heightThresholds.high;

  const visualizerBox = Widget.Box({
    spacing: userOptions.asyncGet().ipod.visualizer.barSpacing,
    css: `${userOptions.asyncGet().ipod.visualizer.extraCss}`,
    hpack: "center",
    vexpand: true,
    children: bars,
    setup: (self) => {
      // Hook to cava output changes
      self.hook(cava, () => {
        if (self.is_destroyed) return;

        const chars = cava.output?.split("") || [];
        const charLen = chars.length;
        
        // Process bars in batches for better performance
        for (let i = 0; i < halfBars; i++) {
          const leftBar = bars[i];
          const rightBar = bars[bars.length - 1 - i];
          
          if (leftBar.is_destroyed || rightBar.is_destroyed) continue;
          
          // Calculate character index once for both sides
          const charIndex = Math.floor(i * (charLen / halfBars));
          const char = chars[charIndex];
          
          // Use cache for height calculation
          let height;
          if (heightCache.has(char)) {
            height = heightCache.get(char);
          } else {
            height = char ? char.charCodeAt(0) - 9601 : 0;
            heightCache.set(char, height);
          }

          // Calculate limited height once
          const limitedHeight = Math.min(height * heightMultiplier, maxHeight);
          const barCss = `
            min-height: ${limitedHeight}rem;
            min-width: ${barMinWidth}px;
            transition: min-height ${transitionMs}ms ease;
          `;
          
          // Determine bar class based on height
          const barClass = height > thresholdHigh
            ? "cava-bar cava-bar-high"
            : height > thresholdMed
              ? "cava-bar cava-bar-med"
              : "cava-bar cava-bar-low";

          // Update both bars simultaneously
          leftBar.css = barCss;
          rightBar.css = barCss;
          leftBar.className = barClass;
          rightBar.className = barClass;
        }
      }, "output-changed");

      // Hook to track changes to update colors
      const player = getPlayer();
      if (player) {
        self.hook(player, async () => {
          if (self.is_destroyed) return;
          if (player.coverPath) {
            await updateColors(player.coverPath);
          }
        }, "notify::cover-path");
      }
    },
  });

  return visualizerBox;
};

const ensureDirectoryExists = async (dir) => {
  try {
    await Utils.execAsync(['mkdir', '-p', dir]);
    await Utils.execAsync(['chmod', '755', dir]);
    return true;
  } catch (error) {
    console.error('Failed to create directory:', error);
    return false;
  }
};

const fileExists = (path) => {
  try {
    return GLib.file_test(path, GLib.FileTest.EXISTS);
  } catch (error) {
    return false;
  }
};

const waitForFile = async (path, maxAttempts = 5) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await Utils.execAsync(['test', '-r', path]);
      const size = (await Utils.execAsync(['stat', '-c', '%s', path]))[0];
      return size > 0;
    } catch (error) {}
    await new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
      resolve();
      return GLib.SOURCE_REMOVE;
    }));
  }
  return false;
};

const createBlurredCopy = async (sourcePath) => {
  try {
    if (!sourcePath) return null;

    const cacheDir = Glib.get_home_dir() +'/.cache/ags/blur_cache';
    await Utils.execAsync(['mkdir', '-p', cacheDir]).catch(console.error);
    
    const hash = (str) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h = h & h;
      }
      return Math.abs(h).toString(36);
    };
    
    const outputPath = `${cacheDir}/blur_${hash(sourcePath)}.jpg`;
    
    // Check cache first with fast stat command
    try {
      const stats = await Utils.execAsync(['stat', '-c', '%Y-%s', outputPath]);
      const [mtime, size] = stats[0].split('-');
      
      if (size > 0 && (Date.now() / 1000 - parseInt(mtime)) < 7200) { // Increased cache time to 2 hours
        return outputPath;
      }
    } catch (error) {}

    if (!await waitForFile(sourcePath)) return null;

    try {
      // Optimize blur process by doing resize and blur in one command
      await Utils.execAsync([
        'convert',
        sourcePath,
        '-strip',
        '-interlace', 'Plane',
        '-resize', '25%', // Reduced size for faster processing
        '-gaussian-blur', '0x8',
        '-quality', '85', // Slightly reduced quality for better performance
        outputPath
      ]);
      
      if (await waitForFile(outputPath)) {
        return outputPath;
      }
    } catch (error) {
      console.error('Image processing failed:', error);
    }

    return null;
  } catch (error) {
    console.error('Failed to create blurred copy:', error);
    return null;
  }
};

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// const throttle = (func, limit) => {
//   let inThrottle;
//   return (...args) => {
//     if (!inThrottle) {
//       func(...args);
//       inThrottle = true;
//       setTimeout(() => inThrottle = false, limit);
//     }
//   };
// };

const CACHE_DIR = `${Utils.HOME}/.cache/ags/media_cache`;
const CACHE_FILE = `${CACHE_DIR}/track_cache.json`;

// Ensure cache directory exists
Utils.execAsync(['mkdir', '-p', CACHE_DIR]).catch(console.error);

// Track cache structure
const trackCache = new Map();

// Load cache from disk
const loadTrackCache = async () => {
  try {
    let content;
    try {
      content = await Utils.readFile(CACHE_FILE);
    } catch (error) {
      console.log('No existing cache file found');
      return;
    }

    if (!content) return;

    try {
      const data = JSON.parse(content);
      Object.entries(data).forEach(([key, value]) => {
        // Only add to cache if the files still exist
        if (fileExists(value.coverPath) && fileExists(value.blurPath)) {
          trackCache.set(key, {
            ...value,
            lastAccessed: new Date(value.lastAccessed)
          });
        }
      });
    } catch (parseError) {
      console.error('Failed to parse cache file:', parseError);
    }
  } catch (error) {
    console.error('Failed to load track cache:', error);
  }
};

// Save cache to disk
const saveTrackCache = debounce(async () => {
  try {
    const cacheData = {};
    trackCache.forEach((value, key) => {
      // Only save entries with valid files
      if (fileExists(value.coverPath) && fileExists(value.blurPath)) {
        cacheData[key] = value;
      }
    });
    await Utils.writeFile(JSON.stringify(cacheData, null, 2), CACHE_FILE);
  } catch (error) {
    console.error('Failed to save track cache:', error);
  }
}, 1000);

const readFileContent = (path) => {
  try {
    const file = Gio.File.new_for_path(path);
    const [success, contents] = file.load_contents(null);
    if (!success) return null;
    return contents;
  } catch (error) {
    console.error('Failed to read file:', error);
    return null;
  }
};

const getImageMime = (data) => {
  const header = data.slice(0, 12);
  if (header[0] === 0xFF && header[1] === 0xD8) return 'image/jpeg';
  if (header[0] === 0x89 && header[1] === 0x50) return 'image/png';
  if (header[0] === 0x47 && header[1] === 0x49) return 'image/gif';
  return 'image/jpeg'; // fallback
};

const createDataUrl = (data) => {
  if (!data) return null;
  const mime = getImageMime(data);
  const base64 = GLib.base64_encode(data);
  return `data:${mime};base64,${base64}`;
};

// const createBlurredDataUrl = async (sourcePath) => {
//   try {
//     if (coverArtCache.has(sourcePath)) {
//       return coverArtCache.get(sourcePath);
//     }

//     const sourceData = readFileContent(sourcePath);
//     if (!sourceData) {
//       console.error('Failed to read source file:', sourcePath);
//       return null;
//     }

//     // If blur is disabled, just create a data URL from the source
//     if (!userOptions.asyncGet().ipod.background.enableBlur) {
//       const dataUrl = createDataUrl(sourceData);
//       if (dataUrl) {
//         coverArtCache.set(sourcePath, dataUrl);
//       }
//       return dataUrl;
//     }

//     const tempDir = '/tmp/ags_blur';
//     await ensureDirectoryExists(tempDir);
    
//     const tempInput = `${tempDir}/temp_input_${GLib.uuid_string_random()}.jpg`;
//     const tempOutput = `${tempDir}/temp_output_${GLib.uuid_string_random()}.jpg`;

//     const tempFile = Gio.File.new_for_path(tempInput);
//     tempFile.replace_contents(sourceData, null, false, Gio.FileCreateFlags.NONE, null);

//     await Utils.execAsync([
//       'convert', tempInput,
//       '-quality', `${userOptions.asyncGet().ipod.background.imageQuality}`,
//       '-resize', `${userOptions.asyncGet().ipod.background.imageResize}%`,
//       '-blur', userOptions.asyncGet().ipod.background.blurAmount,
//       '-strip',
//       tempOutput
//     ]);

//     const processedData = readFileContent(tempOutput);
    
//     await Utils.execAsync(['rm', '-f', tempInput, tempOutput]);

//     if (!processedData) {
//       console.error('Failed to process image');
//       return null;
//     }

//     const dataUrl = createDataUrl(processedData);
//     if (dataUrl) {
//       coverArtCache.set(sourcePath, dataUrl);
//     }

//     return dataUrl;
//   } catch (error) {
//     console.error('Failed to create blurred data URL:', error);
//     return null;
//   }
// };

// const coverArtCache = new Map();

const getTrackCacheKey = (player) => {
  if (!player) return null;
  return `${player.trackTitle}_${player.trackArtists.join(',')}_${player.trackAlbum}`;
};

const updateTrackCache = (player, coverPath, blurPath) => {
  const key = getTrackCacheKey(player);
  if (!key) return;
  
  trackCache.set(key, {
    coverPath,
    blurPath,
    lastAccessed: Date.now()
  });
  
  saveTrackCache();
};

const getTrackFromCache = (player) => {
  const key = getTrackCacheKey(player);
  if (!key) return null;
  
  const cached = trackCache.get(key);
  if (!cached) return null;
  
  // Update last accessed time
  cached.lastAccessed = Date.now();
  trackCache.set(key, cached);
  saveTrackCache();
  
  return cached;
};

let dynamicStyleProvider = null;

let colorUpdateCount = 0;

const defaultColors = {
  colors: {
    color0: '#131318',  // Base color
    color1: '#ff5555',  // High intensity - Red
    color2: '#50fa7b',  // Medium intensity - Green
    color3: '#bd93f9',  // Low intensity - Purple
    color10: '#bdc2ff', // Bright accent
    color13: '#39393f', // Dark accent
    color15: '#e4e1e9'  // Light text
  }
};

const updateColors = async (imagePath) => {
  try {
    if (!imagePath) return;

    // Get colors from pywal cache
    let colors = null;
    try {
      const contents = await Utils.readFileAsync(`${Utils.HOME}/.cache/wal/colors.json`);
      const pywalColors = JSON.parse(contents);
      
      // Create a new colors object with fallbacks
      colors = {
        colors: {
          ...defaultColors.colors,
          ...Object.fromEntries(
            Object.entries(pywalColors.colors)
              .filter(([_, value]) => value && value.match(/^#[0-9a-f]{6}$/i))
          )
        }
      };
      
      // Ensure we have all required colors
      if (!colors.colors.color0 || !colors.colors.color10 || !colors.colors.color15) {
        throw new Error('Missing required colors');
      }
    } catch (err) {
      console.log('Using default colors due to error:', err.message);
      colors = defaultColors;
    }

    // Find all visualizer bars and update their colors based on class
    const findWidgetsByClass = (widget, className) => {
      if (!widget || !widget.get_children) return [];
      let results = [];
      if (widget.className?.includes(className)) results.push(widget);
      widget.get_children().forEach(child => {
        results = results.concat(findWidgetsByClass(child, className));
      });
      return results;
    };

    // Helper to safely process CSS
    // const processCss = (newStyles) => {
    //   return newStyles
    //     .split('\n')
    //     .map(line => line.trim())
    //     .filter(line => line && !line.includes('&'))
    //     .join(' ');
    // };

    if (mainWidget) {
      // Update high intensity bars
      const highBars = findWidgetsByClass(mainWidget, 'cava-bar-high');
      highBars.forEach(bar => {
        const currentHeight = bar.css?.match(/min-height:\s*([^;]+)/)?.[1] || '0';
        const currentWidth = bar.css?.match(/min-width:\s*([^;]+)/)?.[1] || '0';
        const currentTransition = bar.css?.match(/transition:\s*([^;]+)/)?.[1] || 'none';
        
        bar.css = `
          background-color: ${colors.colors.color10};
          min-height: ${currentHeight};
          min-width: ${currentWidth};
          transition: ${currentTransition};
        `;
      });

      // Update medium intensity bars
      const medBars = findWidgetsByClass(mainWidget, 'cava-bar-med');
      medBars.forEach(bar => {
        const currentHeight = bar.css?.match(/min-height:\s*([^;]+)/)?.[1] || '0';
        const currentWidth = bar.css?.match(/min-width:\s*([^;]+)/)?.[1] || '0';
        const currentTransition = bar.css?.match(/transition:\s*([^;]+)/)?.[1] || 'none';
        
        bar.css = `
          background-color: ${colors.colors.color15};
          min-height: ${currentHeight};
          min-width: ${currentWidth};
          transition: ${currentTransition};
        `;
      });

      // Update low intensity bars
      const lowBars = findWidgetsByClass(mainWidget, 'cava-bar-low');
      lowBars.forEach(bar => {
        const currentHeight = bar.css?.match(/min-height:\s*([^;]+)/)?.[1] || '0';
        const currentWidth = bar.css?.match(/min-width:\s*([^;]+)/)?.[1] || '0';
        const currentTransition = bar.css?.match(/transition:\s*([^;]+)/)?.[1] || 'none';
        
        bar.css = `
          background-color: ${colors.colors.color13};
          min-height: ${currentHeight};
          min-width: ${currentWidth};
          transition: ${currentTransition};
        `;
      });

      // Update track title
      const trackTitles = findWidgetsByClass(mainWidget, 'track-title');
      trackTitles.forEach(widget => {
        widget.css = `color: ${colors.colors.color15};`;
      });

      // Update track artist
      const trackArtists = findWidgetsByClass(mainWidget, 'track-artist');
      trackArtists.forEach(widget => {
        widget.css = `color: ${colors.colors.color13};`;
      });

      // Update control buttons
      const controlButtons = findWidgetsByClass(mainWidget, 'control-button');
      controlButtons.forEach(button => {
        button.css = `color: ${colors.colors.color15};`;
      });

      // Force redraw
      mainWidget.queue_draw();
    }
  } catch (error) {
    console.error('Failed to update colors:', error);
  }
};

// // const updateCoverArt = async () => {
// //   const player = getPlayer();
// //   if (!player) return;

// //   const trackId = getTrackCacheKey(player);
// //   const cached = getTrackFromCache(player);

// //   if (cached) {
// //     currentBlurredPath = cached.blurPath;
// //     if (backgroundLayer) toggleBackground();
// //     return;
// //   }

// //   const coverPath = player?.coverPath;
// //   if (!coverPath || coverPath === lastCoverPath) return;
  
// //   lastCoverPath = coverPath;

// //   // Check memory cache first
// //   const cachedBlur = getFromBlurCache(coverPath);
// //   if (cachedBlur) {
// //     currentBlurredPath = cachedBlur;
// //     if (backgroundLayer) toggleBackground();
// //     updateTrackCache(player, coverPath, cachedBlur);
// //     return;
// //   }

// //   // Process blur in parallel
// //   createBlurredCopy(coverPath).then(blurPath => {
// //     if (blurPath) {
// //       currentBlurredPath = blurPath;
// //       addToBlurCache(coverPath, blurPath);
// //       if (backgroundLayer) toggleBackground();
// //       updateTrackCache(player, coverPath, blurPath);
// //     }
// //   });
// // };

// // Memory cache for blurred images
// const blurCache = new Map();
// const BLUR_CACHE_SIZE = 10;

// // LRU cache implementation for blur cache
// const addToBlurCache = (key, value) => {
//   if (blurCache.size >= BLUR_CACHE_SIZE) {
//     const firstKey = blurCache.keys().next().value;
//     blurCache.delete(firstKey);
//   }
//   blurCache.set(key, value);
// };

// const getFromBlurCache = (key) => {
//   const value = blurCache.get(key);
//   if (value) {
//     blurCache.delete(key);
//     blurCache.set(key, value);
//   }
//   return value;
// };

const CoverArt = () => {
  let currentBlurPath = null;
  let hookId = null;
  let isDestroyed = false;
  let lastBlurUpdate = 0;

  const createIcon = () => Widget.Icon({
    icon: COVER_FALLBACK,
    size: userOptions.asyncGet().ipod.coverArt.size,
  });

  const coverArt = Widget.Box({
    className: "cover-art",
    hexpand: false,
    vexpand: false,
    css: `
      min-width: ${userOptions.asyncGet().ipod.coverArt.size}px;
      min-height: ${userOptions.asyncGet().ipod.coverArt.size}px;
      border-radius: ${userOptions.asyncGet().ipod.coverArt.borderRadius}px;
      background-size: cover;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.3;
    `,
    children: [createIcon()],
    setup: (self) => {
      let lastCoverPath = null;

      const updateCoverArt = async () => {
        try {
          const player = getPlayer();
          
          // If no player or player is not playing, disable cover art
          if (!player || !player.playBackStatus) {
            self.css = `
              min-width: ${userOptions.asyncGet().ipod.coverArt.size}px;
              min-height: ${userOptions.asyncGet().ipod.coverArt.size}px;
              border-radius: ${userOptions.asyncGet().ipod.coverArt.borderRadius}px;
              background-size: cover;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.3;
            `;
            self.children = [createIcon()];
            updateBackground(null);
            return;
          }

          if (!player.coverPath) {
            self.css = `
              min-width: ${userOptions.asyncGet().ipod.coverArt.size}px;
              min-height: ${userOptions.asyncGet().ipod.coverArt.size}px;
              border-radius: ${userOptions.asyncGet().ipod.coverArt.borderRadius}px;
              background-size: cover;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.5;
            `;
            self.children = [createIcon()];
            updateBackground(null);
            return;
          }

          // Don't update if it's the same cover
          if (lastCoverPath === player.coverPath) {
            return;
          }
          lastCoverPath = player.coverPath;

          // Update colors based on the new cover art
          await updateColors(player.coverPath);

          // Check cache first
          const cached = getTrackFromCache(player);
          if (cached?.blurPath) {
            updateBackground(cached.blurPath);
          } else {
            // Create new blur if not in cache
            const blurPath = await createBlurredCopy(player.coverPath);
            if (blurPath) {
              updateTrackCache(player, player.coverPath, blurPath);
              updateBackground(blurPath);
            } else {
              updateBackground(null);
            }
          }

          // Update cover art display
          if (fileExists(player.coverPath)) {
            self.css = `
              min-width: ${userOptions.asyncGet().ipod.coverArt.size}px;
              min-height: ${userOptions.asyncGet().ipod.coverArt.size}px;
              border-radius: ${userOptions.asyncGet().ipod.coverArt.borderRadius}px;
              background-image: url('${player.coverPath}');
              background-size: cover;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 1;
            `;
            self.children = []; // Remove the icon when we have cover art
          } else {
            self.css = `
              min-width: ${userOptions.asyncGet().ipod.coverArt.size}px;
              min-height: ${userOptions.asyncGet().ipod.coverArt.size}px;
              border-radius: ${userOptions.asyncGet().ipod.coverArt.borderRadius}px;
              background-size: cover;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.5;
            `;
            self.children = [createIcon()];
          }
        } catch (error) {
          console.error('Failed to update cover art:', error);
          if (!isDestroyed) {
            self.css = `
              min-width: ${userOptions.asyncGet().ipod.coverArt.size}px;
              min-height: ${userOptions.asyncGet().ipod.coverArt.size}px;
              border-radius: ${userOptions.asyncGet().ipod.coverArt.borderRadius}px;
              background-size: cover;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.3;
            `;
            self.children = [createIcon()];
            updateBackground(null);
          }
        }
      };

      // Hook for MPRIS player changes
      hookId = self.hook(Mpris, () => {
        if (isDestroyed) return;
        updateCoverArt().catch(error => {
          console.error('Unhandled error in cover art update:', error);
          if (!isDestroyed) {
            self.css = `
              min-width: ${userOptions.asyncGet().ipod.coverArt.size}px;
              min-height: ${userOptions.asyncGet().ipod.coverArt.size}px;
              border-radius: ${userOptions.asyncGet().ipod.coverArt.borderRadius}px;
              background-size: cover;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.3;
            `;
            self.children = [createIcon()];
            updateBackground(null);
          }
        });
      });

      // Monitor the media directory for changes
      const mediaPath = `${Utils.HOME}/.cache/ags/media/`;
      const fileMonitor = Utils.monitorFile(mediaPath);
      
      const fileHookId = fileMonitor.connect('changed', () => {
        const player = getPlayer();
        if (player && player.coverPath) {
          updateColors(player.coverPath).catch(error => {
            console.error('Failed to update colors on artwork change:', error);
          });
        }
      });

      self.connect('destroy', () => {
        fileMonitor.disconnect(fileHookId);
      });
    },
  });

  const container = Widget.Box({
    className: "cover-art-container",
    hexpand: false,
    vexpand: false,
    visible: false, // Start hidden
    css: `
      min-width: ${userOptions.asyncGet().ipod.coverArt.size}px;
      min-height: ${userOptions.asyncGet().ipod.coverArt.size}px;
    `,
    children: [coverArt],
    setup: (self) => {
      const cleanup = () => {
        isDestroyed = true;
        if (hookId) {
          coverArt.unhook(hookId);
          hookId = null;
        }
      };

      // Add hook to update visibility based on player state
      const visibilityHook = self.hook(Mpris, () => {
        const player = getPlayer();
        self.visible = !!(player && player.playBackStatus);
      });

      self.connect('destroy', () => {
        cleanup();
        self.unhook(visibilityHook);
      });
      self.connect('unrealize', () => {
        cleanup();
        self.unhook(visibilityHook);
      });
    },
  });

  const updateBackground = (blurPath) => {
    try {
      if (!backgroundLayer || isDestroyed) return;

      const now = Date.now();
      if (now - lastBlurUpdate < 100) return; // Debounce updates
      lastBlurUpdate = now;

      if (blurPath && showBackground && userOptions.asyncGet().ipod.background.enableBlur) {
        currentBlurredPath = blurPath;
        backgroundLayer.css = `
          min-height: ${userOptions.asyncGet().ipod.widget.minHeight}px;
          border-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
          -gtk-outline-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
          background: linear-gradient(alpha(@theme_bg_color, ${userOptions.asyncGet().ipod.background.defaultOpacity}), 
            alpha(@theme_bg_color, ${userOptions.asyncGet().ipod.background.defaultOpacity})), 
            url('${blurPath}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          transition: all ${userOptions.asyncGet().ipod.background.transitionMs}ms ease;
        `;
      } else {
        currentBlurredPath = null;
        backgroundLayer.css = `
          min-height: ${userOptions.asyncGet().ipod.widget.minHeight}px;
          border-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
          -gtk-outline-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
          background: transparent;
          transition: all ${userOptions.asyncGet().ipod.background.transitionMs}ms ease;
        `;
      }
    } catch (error) {
      console.error('Failed to update background:', error);
    }
  };

  return container;
};

loadTrackCache();
export default () => {
  let lastTitle = '';
  let updateTimeout = null;
  
  const widget = Widget.Box({
    className: "ipod-widget",
    vpack: "center",
    vexpand: true,
    hexpand: true,
    css: `
      border: ${userOptions.asyncGet().ipod.widget.borderWidth}px solid alpha(@outline, ${userOptions.asyncGet().ipod.widget.borderOpacity});
      min-height: ${userOptions.asyncGet().ipod.widget.minHeight}px; 
      border-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
      padding: ${userOptions.asyncGet().ipod.widget.padding};
      margin: ${userOptions.asyncGet().ipod.widget.margin};
      background-color: alpha(@theme_bg_color, ${userOptions.asyncGet().ipod.background.defaultOpacity});
      ${userOptions.asyncGet().ipod.widget.extraCss}
    `,
    setup: (self) => {
      mainWidget = self;
      self.hook(Mpris, () => {
        const player = getPlayer();
        
        if (!self.visible) {
          self.visible = true;
          self.toggleClassName('hidden', false);
          self.toggleClassName('visible', true);
        }

        if (player) {
          const title = player.trackTitle;
          if (title !== lastTitle) {
            lastTitle = title;
            
            if (updateTimeout) {
              GLib.source_remove(updateTimeout);
            }
            
            updateTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, userOptions.asyncGet().ipod.animations.updateDelay, () => {
              updateTimeout = null;
              return GLib.SOURCE_REMOVE;
            });
          }
        }
      });
    },
    children: [
      Widget.Overlay({
        css: `
          border-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
          -gtk-outline-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
        `,
        child: Widget.Box({
          className: "background-layer",
          css: `
            min-height: ${userOptions.asyncGet().ipod.widget.minHeight}px;
            border-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
            -gtk-outline-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
          `,
          setup: (self) => {
            backgroundLayer = self;
            self.css = showBackground && currentBlurredPath ? `
              min-height: ${userOptions.asyncGet().ipod.widget.minHeight}px;
              border-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
              -gtk-outline-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
              background: linear-gradient(alpha(@theme_bg_color, ${userOptions.asyncGet().ipod.background.defaultOpacity}), 
                alpha(@theme_bg_color, ${userOptions.asyncGet().ipod.background.defaultOpacity})), 
                url('${currentBlurredPath}');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
            ` : `
              min-height: ${userOptions.asyncGet().ipod.widget.minHeight}px;
              border-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
              -gtk-outline-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px;
              background: transparent;
            `;
          },
        }),
        overlays: [
      CavaVisualizer(),
          Widget.Box({
            // className: "content-layer",
            children: [
              Widget.Box({
                // className: "controls-container",
                children: [
                  Widget.Box({
                    // className: "left-section",
                    vpack: "center",
                    children: [CoverArt()],
                  }),
                  Widget.Box({
                    vertical: true,
                    vpack: "center",
                    hexpand: true,
                    spacing: 50,
                    children: [
                      TrackLabels(),
                      Widget.Box({
                        css:`border-radius: ${userOptions.asyncGet().ipod.widget.borderRadius}px`,
                        children: [MediaControls()],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return widget;
};
