console.log("%c🚀 Discord Quest Auto-Complete | By SIDO16DZ", "color: #5865F2; font-size: 16px; font-weight: bold;");
console.log("%chttps://github.com/SIDO16DZ/discord-quest-auto-complete", "color: #008000; font-size: 11px;");

delete window.aetheryx;
window.aetheryx = true;

const req = typeof webpackChunkdiscord_app !== "undefined" 
    ? webpackChunkdiscord_app.push([[Symbol()], {}, e => e]) 
    : null;

if (!req) {
    console.error("❌ [SIDO16DZ Script] Could not find Discord Webpack chunk.");
} else {
    const modules = Object.values(req.c).filter(m => m && m.exports);

    const QuestStore = modules.find(m => m.exports?.Z?.getQuest || m.exports?.default?.getQuest)?.exports?.Z || modules.find(m => m.exports?.default?.getQuest)?.exports?.default;
    const ChannelStore = modules.find(m => m.exports?.Z?.getPrivateChannels || m.exports?.default?.getPrivateChannels)?.exports?.Z || modules.find(m => m.exports?.default?.getPrivateChannels)?.exports?.default;
    const FluxDispatcher = modules.find(m => m.exports?.Z?.dispatch || m.exports?.default?.dispatch)?.exports?.Z || modules.find(m => m.exports?.default?.dispatch)?.exports?.default;
    const HTTP = modules.find(m => m.exports?.get && m.exports?.post)?.exports || modules.find(m => m.exports?.default?.get && m.exports?.default?.post)?.exports?.default;

    if (!QuestStore) {
        console.error("❌ [SIDO16DZ Script] Could not load QuestStore. Make sure you are logged in and Discord is fully loaded.");
    } else {
        const quests = QuestStore.getQuests();
        const activeQuests = Object.values(quests).filter(q => q.userStatus?.enrolledAt && !q.userStatus?.completedAt);

        if (activeQuests.length === 0) {
            console.log("⚠️ [SIDO16DZ Script] No active quests found to complete.");
        } else {
            activeQuests.forEach(async (quest) => {
                console.log(`🚀 [SIDO16DZ Script] Processing Quest: ${quest.config.messages.questName}`);
                
                const taskConfig = quest.config.taskConfig;
                
                if (taskConfig.tasks.STREAM_ON_DESKTOP && FluxDispatcher && ChannelStore) {
                    const pid = Math.floor(Math.random() * 100000);
                    const channel = Object.values(ChannelStore.getPrivateChannels())[0]?.id;

                    FluxDispatcher.dispatch({
                        type: "STREAM_START",
                        streamType: "guild",
                        guildId: null,
                        channelId: channel,
                        pid: pid,
                    });

                    console.log(`📡 [SIDO16DZ Script] Simulating stream for quest: ${quest.config.messages.questName}`);
                }

                if (taskConfig.tasks.PLAY_ON_DESKTOP && HTTP) {
                    const secondsNeeded = taskConfig.tasks.PLAY_ON_DESKTOP.target;
                    
                    for (let i = 0; i <= secondsNeeded; i += 30) {
                        await new Promise(r => setTimeout(r, 1000));
                        HTTP.post({
                            url: `/quests/${quest.id}/heartbeat`,
                            body: { stream_key: null, terminal: false }
                        });
                    }
                }

                console.log(`✅ [SIDO16DZ Script] Quest completed or heartbeat sent for: ${quest.config.messages.questName}`);
            });
        }
    }
}
