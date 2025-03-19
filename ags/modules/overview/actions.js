import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import Hyprland from 'resource:///com/github/Aylur/ags/service/hyprland.js';

const moveClientToWorkspace = (address, workspace) => 
    Utils.execAsync(['bash', '-c', `hyprctl dispatch movetoworkspacesilent ${workspace},address:${address} &`]);

export const dumpToWorkspace = (from, to) => {
    if (from === to) return;
    Hyprland.clients
        .filter(client => client.workspace.id === from)
        .forEach(client => moveClientToWorkspace(client.address, to));
};

export const swapWorkspace = (workspaceA, workspaceB) => {
    if (workspaceA === workspaceB) return;
    
    const clients = Hyprland.clients.reduce((acc, client) => {
        const workspace = client.workspace.id;
        if (workspace === workspaceA) acc.a.push(client.address);
        if (workspace === workspaceB) acc.b.push(client.address);
        return acc;
    }, { a: [], b: [] });

    clients.a.forEach(address => moveClientToWorkspace(address, workspaceB));
    clients.b.forEach(address => moveClientToWorkspace(address, workspaceA));
};