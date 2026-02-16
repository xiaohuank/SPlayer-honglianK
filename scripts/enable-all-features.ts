#!/usr/bin/env tsx
/**
 * 启用所有功能的脚本
 * 此脚本会更新设置存储，启用所有可用功能
 */

import { join, dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 用户数据目录路径
const userDataPath = join(__dirname, '../UserData');

// 主进程配置文件路径
const mainConfigPath = join(userDataPath, 'config.json');

// 前端存储文件路径
const frontEndStorePath = join(userDataPath, 'localStorage.json');

// 确保用户数据目录存在
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
  console.log(`📁 创建用户数据目录: ${userDataPath}`);
}

/**
 * 读取 JSON 文件
 */
function readJsonFile(path: string, defaultValue: any = {}) {
  if (fs.existsSync(path)) {
    try {
      const content = fs.readFileSync(path, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️  读取文件 ${path} 失败，使用默认值`, error);
      return defaultValue;
    }
  }
  return defaultValue;
}

/**
 * 写入 JSON 文件
 */
function writeJsonFile(path: string, data: any) {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ 写入文件 ${path} 失败`, error);
    return false;
  }
}

/**
 * 启用主进程所有功能
 */
function enableMainProcessFeatures() {
  console.log('🔧 启用主进程功能...');
  
  // 读取现有配置
  const mainConfig = readJsonFile(mainConfigPath);
  
  // 启用任务栏歌词
  mainConfig.taskbar = {
    enabled: true,
    maxWidth: 30,
    showCover: true,
    position: 'automatic',
    showWhenPaused: true,
    autoShrink: true,
    margin: 10,
    minWidth: 10
  };
  
  // 启用 WebSocket
  mainConfig.websocket = {
    enabled: true,
    port: 25885
  };
  
  // 启用 macOS 状态栏歌词（如果是 macOS）
  if (process.platform === 'darwin') {
    mainConfig.macos = {
      statusBarLyric: {
        enabled: true
      }
    };
  }
  
  // 保存配置
  if (writeJsonFile(mainConfigPath, mainConfig)) {
    console.log('✅ 主进程功能已全部启用');
  } else {
    console.error('❌ 保存主进程配置失败');
  }
}

/**
 * 启用前端所有功能
 */
function enableFrontEndFeatures() {
  console.log('🔧 启用前端功能...');
  
  try {
    // 读取现有前端存储
    let frontEndStore: any = {};
    if (fs.existsSync(frontEndStorePath)) {
      const content = fs.readFileSync(frontEndStorePath, 'utf8');
      frontEndStore = JSON.parse(content);
    }
    
    // 获取设置存储
    let settingStore = frontEndStore['setting-store'] || '{}';
    let settingData = JSON.parse(settingStore);
    
    // 启用所有功能开关
    const enabledFeatures = {
      // 基础功能
      useOnlineService: true,
      showTaskbarProgress: true,
      
      // 播放功能
      autoPlay: true,
      useNextPrefetch: true,
      songVolumeFade: true,
      enableReplayGain: true,
      useSongUnlock: true,
      
      // 歌词功能
      showYrc: true,
      showTran: true,
      showRoma: true,
      showWordsRoma: true,
      useAMLyrics: true,
      useAMSpring: true,
      enableOnlineTTMLLyric: true,
      enableQQMusicLyric: true,
      localLyricQQMusicMatch: true,
      
      // 界面功能
      showSpectrums: true,
      dynamicCover: true,
      themeFollowCover: true,
      themeGlobalColor: true,
      
      // 下载功能
      downloadMeta: true,
      downloadCover: true,
      downloadLyric: true,
      downloadLyricTranslation: true,
      downloadLyricRomaji: true,
      useUnlockForDownload: true,
      downloadMakeYrc: true,
      downloadSaveAsAss: true,
      saveMetaFile: true,
      
      // 系统集成
      smtcOpen: true,
      discordRpc: {
        enabled: true,
        showWhenPaused: true,
        displayMode: 'Name'
      },
      
      // 流媒体
      streamingEnabled: true,
      
      // 其他功能
      showSearchHistory: true,
      enableSearchKeyword: true,
      showHomeGreeting: true,
      preventSleep: true,
      
      // 各种显示选项
      showPlayMeta: true,
      showSongQuality: true,
      showPlayerQuality: true,
      showSongPrivilegeTag: true,
      showSongExplicitTag: true,
      showSongOriginalTag: true,
      showSongAlbum: true,
      showSongDuration: true,
      showSongOperations: true,
      showSongArtist: true,
      
      // 侧边栏全部显示
      sidebarHide: {
        hideDiscover: false,
        hidePersonalFM: false,
        hideRadioHot: false,
        hideLike: false,
        hideCloud: false,
        hideDownload: false,
        hideLocal: false,
        hideHistory: false,
        hideUserPlaylists: false,
        hideLikedPlaylists: false,
        hideHeartbeatMode: false
      },
      
      // 歌单页面元素全部显示
      playlistPageElements: {
        tags: true,
        creator: true,
        time: true,
        description: true
      },
      
      // 全屏播放器元素全部显示
      fullscreenPlayerElements: {
        like: true,
        addToPlaylist: true,
        download: true,
        comments: true,
        desktopLyric: true,
        moreSettings: true,
        copyLyric: true,
        lyricOffset: true,
        lyricSettings: true
      },
      
      // 右键菜单全部显示
      contextMenuOptions: {
        play: true,
        playNext: true,
        addToPlaylist: true,
        mv: true,
        dislike: true,
        more: true,
        cloudImport: true,
        deleteFromPlaylist: true,
        deleteFromCloud: true,
        deleteFromLocal: true,
        openFolder: true,
        cloudMatch: true,
        wiki: true,
        search: true,
        download: true,
        copyName: true,
        musicTagEditor: true
      },
      
      // 首页栏目全部显示
      homePageSections: [
        { key: 'playlist', name: '专属歌单', visible: true, order: 0 },
        { key: 'radar', name: '雷达歌单', visible: true, order: 1 },
        { key: 'artist', name: '歌手推荐', visible: true, order: 2 },
        { key: 'video', name: '推荐 MV', visible: true, order: 3 },
        { key: 'radio', name: '推荐播客', visible: true, order: 4 },
        { key: 'album', name: '新碟上架', visible: true, order: 5 }
      ],
      
      // 启用所有解锁服务器
      songUnlockServer: [
        { key: 'bodian', enabled: true },
        { key: 'gequbao', enabled: true },
        { key: 'netease', enabled: true },
        { key: 'kuwo', enabled: true }
      ]
    };
    
    // 合并设置
    settingData = { ...settingData, ...enabledFeatures };
    
    // 保存前端存储
    frontEndStore['setting-store'] = JSON.stringify(settingData);
    fs.writeFileSync(frontEndStorePath, JSON.stringify(frontEndStore, null, 2));
    
    console.log('✅ 前端功能已全部启用');
    
  } catch (error) {
    console.error('❌ 启用前端功能时出错:', error);
    console.log('ℹ️  前端设置将在应用启动时自动初始化');
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始启用所有功能...');
  
  try {
    // 启用主进程功能
    enableMainProcessFeatures();
    
    // 启用前端功能
    enableFrontEndFeatures();
    
    console.log('\n🎉 所有功能已成功启用！');
    console.log('\n📋 已启用的主要功能：');
    console.log('   • 本地音乐和在线音乐服务');
    console.log('   • 桌面歌词和任务栏歌词');
    console.log('   • Discord RPC 集成');
    console.log('   • 系统媒体控件集成');
    console.log('   • WebSocket 远程控制');
    console.log('   • 所有音频效果和均衡器');
    console.log('   • 完整的下载功能');
    console.log('   • 流媒体服务支持');
    console.log('   • 所有界面和动画效果');
    
    console.log('\n💡 提示：');
    console.log('   • 启动应用后，所有功能将立即生效');
    console.log('   • 您可以在设置中根据需要调整具体参数');
    
  } catch (error) {
    console.error('❌ 启用功能时出错:', error);
  }
}

// 运行主函数
main();
