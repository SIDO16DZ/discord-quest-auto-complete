delete window.$;
let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
webpackChunkdiscord_app.pop();

let modules = Object.values(wpRequire.c);

let ApplicationStreamingStore = modules.find(x => x?.exports?.A?.__proto__?.getStreamerActiveStreamMetadata)?.exports?.A;
let RunningGameStore = modules.find(x => x?.exports?.Ay?.getRunningGames)?.exports?.Ay;
let QuestsStore = modules.find(x => x?.exports?.A?.__proto__?.getQuest)?.exports?.A;
let ChannelStore = modules.find(x => x?.exports?.A?.__proto__?.getAllThreadsForParent)?.exports?.A;
let GuildChannelStore = modules.find(x => x?.exports?.Ay?.getSFWDefaultChannel)?.exports?.Ay;

let FluxDispatcher = modules.find(x => x?.exports?.default?.dispatch && x?.exports?.default?.subscribe)?.exports?.default 
    || modules.find(x => x?.exports?.Z?.dispatch)?.exports?.Z
    || modules.find(x => x?.exports?.h?.__proto__?._flushWaitQueue)?.exports?.h;

let api = modules.find(x => x?.exports?.Bo?.get)?.exports?.Bo 
    || modules.find(x => x?.exports?.tn?.get)?.exports?.tn
    || modules.find(x => x?.exports?.HTTP?.get)?.exports?.HTTP;

const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
let quests = [...(QuestsStore?.quests?.values() ?? [])].filter(x => {
    const expiresAt = new Date(x.config?.expiresAt).getTime();
    return x.userStatus?.enrolledAt && !x.userStatus?.completedAt && expiresAt > Date.now() && supportedTasks.find(y => Object.keys((x.config.taskConfig ?? x.config.taskConfigV2)?.tasks ?? {}).includes(y));
});

let isApp = typeof DiscordNative !== "undefined";

if (quests.length === 0) {
    console.log("You don't have any uncompleted quests!");
} else {
    console.log(`Starting ${quests.length} quests in parallel...`);

    // تشغيل جميع المهام مع بعضها في نفس الوقت
    quests.forEach(quest => {
        const pid = Math.floor(Math.random() * 30000) + 1000;
        const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
        const taskName = supportedTasks.find(x => taskConfig.tasks?.[x] != null);
        const secondsNeeded = taskConfig?.tasks?.[taskName]?.target;
        let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

        if (!taskName || !secondsNeeded) return;

        const taskData = taskConfig?.tasks?.[taskName];
        const application = quest.config.application ?? quest.config.applications?.[0] ?? taskConfig?.application ?? taskData?.applications?.[0] ?? Object.values(taskConfig?.tasks ?? {}).find(t => t?.applicationId);
        const applicationId = application?.id ?? application?.applicationId ?? quest.id;
        const applicationName = application?.name ?? application?.applicationName ?? "Unknown";
        const questName = quest.config.messages?.questName ?? "Unknown Quest";

        if (taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
            const speed = 7;
            let fn = async () => {
                while (true) {
                    const remaining = Math.min(speed, secondsNeeded - secondsDone);
                    await new Promise(resolve => setTimeout(resolve, remaining * 1000));
                    const timestamp = secondsDone + speed;
                    try {
                        const res = await api.post({url: `/quests/${quest.id}/video-progress`, body: {timestamp: Math.min(secondsNeeded, timestamp + Math.random())}});
                        secondsDone = Math.min(secondsNeeded, timestamp);
                        if (res.body?.completed_at != null || timestamp >= secondsNeeded) break;
                    } catch (e) { break; }
                }
                console.log(`[DONE] ${questName}`);
            };
            fn();
        } else if (taskName === "PLAY_ON_DESKTOP" && isApp) {
            api.get({url: `/applications/public?application_ids=${applicationId}`}).then(res => {
                const appData = res.body?.[0];
                if (!appData) return;
                const exeName = appData.executables?.find(x => x.os === "win32")?.name?.replace(">", "") ?? appData.name.replace(/[\/\\:*?"<>|]/g, "");

                const fakeGame = {
                    cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
                    exeName,
                    exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
                    hidden: false,
                    isLauncher: false,
                    id: applicationId,
                    name: appData.name,
                    pid: pid,
                    pidPath: [pid],
                    processName: appData.name,
                    start: Date.now(),
                };

                const currentGames = RunningGameStore.getRunningGames();
                RunningGameStore.getRunningGames = () => [...currentGames, fakeGame];
                
                if (FluxDispatcher) {
                    FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: [], added: [fakeGame], games: RunningGameStore.getRunningGames()});
                }

                let fn = data => {
                    let progress = quest.config.configVersion === 1 ? data?.userStatus?.streamProgressSeconds : Math.floor(data?.userStatus?.progress?.PLAY_ON_DESKTOP?.value ?? 0);
                    console.log(`[PROGRESS] ${questName}: ${progress}/${secondsNeeded}`);

                    if (progress >= secondsNeeded) {
                        console.log(`[DONE] ${questName}`);
                        if (FluxDispatcher) FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                    }
                };

                if (FluxDispatcher) FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
                console.log(`[STARTED] Spoofed ${appData.name}`);
            });
        }
    });
}
