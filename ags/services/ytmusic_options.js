const options = {
    // Audio quality options
    audioQuality: {
        value: 'low', // Default value
        options: {
            'low': {
                format: 'worstaudio',
                description: 'Low quality (saves data)',
            },
            'medium': {
                format: 'bestaudio[abr<=128]/bestaudio',
                description: 'Medium quality (128kbps)',
            },
            'high': {
                format: 'bestaudio[acodec=opus]/bestaudio',
                description: 'High quality (best opus/audio)',
            },
        },
    },

    // Other YTMusic options
    autoQueue: {
        value: true,
        description: 'Automatically queue similar tracks',
    },
    queueSize: {
        value: 5,
        description: 'Number of tracks to auto-queue',
    },
    cacheTimeout: {
        value: 30,
        description: 'Cache timeout in minutes',
    },
};

export default options;
