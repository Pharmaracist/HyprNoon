import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import { MaterialIcon } from '../.commonwidgets/materialicon.js';
import GHEntry from './tools/name.js'
const { Box, Label, Scrollable } = Widget;

const REPO_OWNER = `${userOptions.asyncGet().sidebar.github.repoOwner}`;
const REPO_NAME = `${userOptions.asyncGet().sidebar.github.repoName}`;

const fetchGithubUpdates = async () => {
    try {
        const cmd = `curl -s "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits"`;
        const result = await Utils.execAsync(cmd);
        return JSON.parse(result);
    } catch (error) {
        return null;
    }
};

const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
};

const CommitBox = ({ message, author, date }) => {
    const commitDate = new Date(date);
    const [title, ...description] = message.split('\n').filter(line => line.trim() !== '');
    
    return Box({
        className: 'sidebar-chat-message',
        children: [
            Box({
                className: 'sidebar-chat-message-box',
                children: [
                    Box({
                        vertical: true,
                        children: [
                            Box({
                                children: [
                                    MaterialIcon('commit', 'norm'),
                                    Label({
                                        xalign: 0,
                                        className: 'sidebar-chat-name sidebar-chat-name-bot txt-bold',
                                        label: author,
                                    }),
                                    Box({ hexpand: true }),
                                    Label({
                                        xalign: 1,
                                        className: isToday(commitDate) 
                                            ? 'sidebar-chat-name sidebar-chat-name-bot txt-smaller txt-bold'
                                            : 'sidebar-chat-name txt-smaller txt-bold',
                                        label: commitDate.toLocaleDateString(),
                                    }),
                                ],
                            }),
                            Label({
                                xalign: 0,
                                className: 'txt-smaller txt-bold',
                                css: 'color: white;',
                                label: title,
                                wrap: true,
                            }),
                            description.length > 0 ? Label({
                                xalign: 0,
                                className: 'txt-smaller',
                                css: 'color: white;',
                                label: description.join('\n'),
                                wrap: true,
                            }) : null,
                        ],
                    }),
                ],
            }),
        ],
    });
};

const TodayCommitsCount = (commits) => {
    const todayCommits = commits.filter(commit => 
        isToday(new Date(commit.commit.author.date))
    ).length;

    return Box({
        className: 'sidebar-module-box',
        children: [
            Label({
                xalign: 0,
                className: 'sidebar-chat-name sidebar-chat-name-bot txt-bold',
                label: `Today: ${todayCommits} ${todayCommits === 1 ? 'commit' : 'commits'}`,
            }),
        ],
    });
};

const GithubContent = () => Box({
    vertical: true,
    className: 'sidebar-chat-viewport',
    setup: self => {
        const update = async () => {
            const commits = await fetchGithubUpdates();
            if (!commits || !commits.length) return;

            self.children = [
                TodayCommitsCount(commits),
                Box({
                    vertical: true,
                    className: 'spacing-v-5',
                    vexpand: true,
                    children: commits.slice(0, 15).map(commit => 
                        CommitBox({
                            message: commit.commit.message,
                            author: commit.commit.author.name,
                            date: commit.commit.author.date,
                        })
                    ),
                }),
                GHEntry(),
            ];
        };

        update();
        Utils.timeout(1000 * 60 * 120, update);
    },
});

export default Box({
    vertical: true,
    className: 'sidebar-module',
    children: [
        Scrollable({
            vexpand: true,
            className: 'sidebar-scrollable',
            child: GithubContent(),
        }),
    ],
}); 