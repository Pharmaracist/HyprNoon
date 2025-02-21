const { Gtk } = imports.gi;
import { substitute } from './icons.js';

// Get a valid icon from GTK's icon theme
export const getValidIcon = (name, iconFiles = [], fromCache = true, cache = {}) => {
    if (!name) return 'application-x-executable';
    
    const nameLower = name.toLowerCase();
    
    // Try cache first
    if (fromCache && cache[nameLower]) {
        return cache[nameLower];
    }
    
    // Get the icon theme
    const iconTheme = Gtk.IconTheme.get_default();
    
    // Try variations in order
    const variations = [
        nameLower,                    // Direct lowercase
        substitute(nameLower),        // Apply substitutions
        `app-${nameLower}`,          // Common prefix
        'application-x-executable'    // Fallback
    ];
    
    // Find first available icon
    for (const icon of variations) {
        if (iconTheme.has_icon(icon)) {
            if (fromCache) {
                cache[nameLower] = icon;
            }
            return icon;
        }
    }
    
    // If no icon found in theme, return fallback
    return 'application-x-executable';
};
