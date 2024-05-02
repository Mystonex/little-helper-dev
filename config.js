require('dotenv').config();

const config = {
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID,
    rulesChannelId: process.env.RULES_CHANNEL_ID,
    logChannelId: process.env.LOG_CHANNEL_ID,
    memberRoleId: process.env.MEMBER_ROLE_ID,
    leaderChannelId: process.env.LEADER_CHANNEL_ID,
    revengerRoleId: process.env.REVENGER_ROLE_ID,
    helloGIF: process.env.HELLO_GIF,
    rulesGIF: process.env.RULES_GIF,
    nameGIF: process.env.NAME_GIF,
    introductionCH: process.env.INTRODUCTION_CH,
    guideCH: process.env.GUIDE_CH,
    skilltreeCH: process.env.SKILLTREE_CH,
    lvguideCH: process.env.LVGUIDE_CH,
    revengerCH: process.env.REVENGER_CH,
    generalCH: process.env.GENERAL_CH,
    dragonewsCH: process.env.DRAGONEWS_CH
};

module.exports = config;
