import { socketLog } from "../logger";
import { useStore } from "../store";
import { getTrackInfoFromRenderer } from "../utils/track-info";
import net from 'net';
interface ExternalLyricProtocolConfig {
  enabled: boolean;
  kdeConnect: boolean;
  bluetooth: boolean;
  wifi: boolean;
}

/**
 * 外部歌词显示协议服务
 * 支持蓝牙、WiFi、KDE Connect等歌词显示协议
 */
export class ExternalLyricService {
  private static instance: ExternalLyricService;

  private isRunning: boolean = false;
  private currentTrackInfo: any = null;
  private wifiServer: any = null;
  private wifiClients: Set<any> = new Set();
  private kdeConnectClients: Set<any> = new Set();
  private kdeConnectServer: any = null;

  private constructor() {}

  public static getInstance(): ExternalLyricService {
    if (!ExternalLyricService.instance) {
      ExternalLyricService.instance = new ExternalLyricService();
    }
    return ExternalLyricService.instance;
  }

  /**
   * 启动外部歌词显示服务
   */
  public async start(): Promise<void> {
    const store = useStore();
    const externalLyricConfig = store.get("externalLyricProtocol") as ExternalLyricProtocolConfig || { enabled: false, kdeConnect: false, bluetooth: false, wifi: false };
    
    if (!externalLyricConfig.enabled) {
      socketLog.info("External lyric protocol is disabled, skipping start");
      return;
    }

    socketLog.info("Starting external lyric service");
    this.isRunning = true;

    // 初始化各种协议支持
    if (externalLyricConfig.kdeConnect) {
      await this.initKDEConnect();
    }

    if (externalLyricConfig.bluetooth) {
      this.initBluetooth();
    }

    if (externalLyricConfig.wifi) {
      await this.initWiFi();
    }

    // 启动定时更新任务
    this.startUpdateTask();
  }

  /**
   * 停止外部歌词显示服务
   */
  public stop(): void {
    socketLog.info("Stopping external lyric service");
    this.isRunning = false;
    
    // 清理 WiFi 服务器
    if (this.wifiServer) {
      try {
        // 关闭所有客户端连接
        for (const client of this.wifiClients) {
          try {
            client.close();
          } catch (error) {
            socketLog.error('Error closing WiFi client:', error);
          }
        }
        this.wifiClients.clear();
        
        // 关闭服务器
        this.wifiServer.close();
        this.wifiServer = null;
        socketLog.info('WiFi lyric server stopped');
      } catch (error) {
        socketLog.error('Failed to stop WiFi lyric server:', error);
      }
    }
    
    // 清理 KDE Connect 服务器
    if (this.kdeConnectServer) {
      try {
        // 关闭所有客户端连接
        for (const client of this.kdeConnectClients) {
          try {
            client.end();
          } catch (error) {
            socketLog.error('Error closing KDE Connect client:', error);
          }
        }
        this.kdeConnectClients.clear();
        
        // 关闭服务器
        this.kdeConnectServer.close();
        this.kdeConnectServer = null;
        socketLog.info('KDE Connect server stopped');
      } catch (error) {
        socketLog.error('Failed to stop KDE Connect server:', error);
      }
    }
  }

  /**
   * 初始化 KDE Connect 支持
   */
  private async initKDEConnect(): Promise<void> {
    socketLog.info("Initializing KDE Connect support");
    
    try {
      // 创建 TCP 服务器模拟 KDE Connect
      this.kdeConnectServer = net.createServer((socket: any) => {
        socketLog.info('New KDE Connect client connected');
        this.kdeConnectClients.add(socket);
        
        // 发送欢迎消息
        const welcomeMessage = JSON.stringify({
          type: 'kdeconnect.identity',
          body: {
            deviceId: 'SPlayer',
            deviceName: 'SPlayer',
            type: 'desktop',
            protocolVersion: 6
          }
        });
        socket.write(welcomeMessage + '\n');
        
        socket.on('data', (data: any) => {
          try {
            const messages = data.toString().split('\n');
            for (const messageStr of messages) {
              if (!messageStr.trim()) continue;
              
              const message = JSON.parse(messageStr);
              socketLog.log('Received from KDE Connect client:', message);
              
              // 处理身份消息
              if (message.type === 'kdeconnect.identity') {
                socketLog.info(`KDE Connect client identified: ${message.body.deviceName}`);
              }
              
              // 处理配对请求
              if (message.type === 'kdeconnect.pairing.request') {
                socketLog.info('Received pairing request from KDE Connect client');
                // 自动接受配对请求
                const pairResponse = JSON.stringify({
                  type: 'kdeconnect.pairing.response',
                  body: {
                    paired: true,
                    deviceId: 'SPlayer',
                    deviceName: 'SPlayer'
                  }
                });
                socket.write(pairResponse + '\n');
              }
              
              // 处理媒体播放器请求
              if (message.type === 'kdeconnect.mediaplayer.request') {
                socketLog.info('Received media player request from KDE Connect client');
                // 发送当前播放状态
                if (this.currentTrackInfo) {
                  this.sendToKDEConnect(this.currentTrackInfo);
                }
              }
            }
          } catch (error) {
            socketLog.error('Error processing KDE Connect message:', error);
          }
        });
        
        socket.on('close', () => {
          socketLog.info('KDE Connect client disconnected');
          this.kdeConnectClients.delete(socket);
        });
        
        socket.on('error', (error: any) => {
          socketLog.error('KDE Connect client error:', error);
          this.kdeConnectClients.delete(socket);
        });
      });
      
      // KDE Connect 默认使用端口 1716
      this.kdeConnectServer.listen(1716, () => {
        socketLog.info('KDE Connect server started on port 1716');
      });
      
      // 添加 mDNS 服务发现支持
      await this.initMDNS();
      
      socketLog.info('KDE Connect initialized successfully');
    } catch (error) {
      socketLog.error('Failed to initialize KDE Connect:', error);
    }
  }
  
  /**
   * 初始化 mDNS 服务发现
   */
  private async initMDNS(): Promise<void> {
    try {
      // 尝试使用 mdns 或 bonjour 服务
      // 注意：mdns 是可选依赖，可能不存在
      socketLog.info('Attempting to initialize mDNS service discovery');
      socketLog.info('mDNS is an optional dependency and may not be available on all platforms');
      // 跳过 mDNS 初始化，因为它是可选的
      socketLog.info('Skipping mDNS initialization to avoid build errors');
    } catch (error) {
      socketLog.warn('Failed to initialize mDNS service discovery:', error);
      socketLog.info('Continuing without mDNS support');
    }
  }

  /**
   * 初始化蓝牙歌词支持
   */
  private initBluetooth(): void {
    socketLog.info("Initializing Bluetooth lyric support");
    // 实现蓝牙协议支持
    // 这里需要使用蓝牙相关的 API
  }

  /**
   * 初始化 WiFi 歌词支持
   */
  private async initWiFi(): Promise<void> {
    socketLog.info("Initializing WiFi lyric support");
    
    try {
      // 动态导入 WebSocket 模块
      // @ts-ignore - Optional dependency
      const WebSocket = await import('ws');
      // 创建 WebSocket 服务器
      // @ts-ignore - Optional dependency
      this.wifiServer = new WebSocket.Server({ port: 3000 });
      
      this.wifiServer.on('connection', (ws: any) => {
        socketLog.info('New WiFi client connected');
        this.wifiClients.add(ws);
        
        // 发送欢迎消息
        ws.send(JSON.stringify({ 
          type: 'welcome', 
          message: 'Connected to SPlayer External Lyric Service' 
        }));
        
        ws.on('close', () => {
          socketLog.info('WiFi client disconnected');
          this.wifiClients.delete(ws);
        });
        
        ws.on('error', (error: any) => {
          socketLog.error('WiFi client error:', error);
          this.wifiClients.delete(ws);
        });
      });
      
      socketLog.info('WiFi lyric server started on port 3000');
    } catch (error) {
      socketLog.error('Failed to initialize WiFi lyric support:', error);
    }
  }

  /**
   * 启动定时更新任务
   */
  private startUpdateTask(): void {
    // 每 5 秒更新一次歌词信息
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        const trackInfo = await getTrackInfoFromRenderer();
        if (trackInfo) {
          this.updateLyricInfo(trackInfo);
        }
      } catch (error) {
        socketLog.error("Error updating external lyric info:", error);
      }
    }, 5000);
  }

  /**
   * 更新歌词信息
   * @param trackInfo 当前播放信息
   */
  private async updateLyricInfo(trackInfo: any): Promise<void> {
    if (!trackInfo) return;

    // 检查是否需要更新
    const needUpdate = !this.currentTrackInfo || 
        this.currentTrackInfo.title !== trackInfo.title ||
        this.currentTrackInfo.artist !== trackInfo.artist ||
        this.currentTrackInfo.currentLyric !== trackInfo.currentLyric;

    if (!needUpdate) return;

    this.currentTrackInfo = trackInfo;
    socketLog.info(`Updating external lyric info: ${trackInfo.title} - ${trackInfo.artist}`);

    // 发送歌词信息到各种协议
    this.sendToKDEConnect(trackInfo);
    this.sendToBluetooth(trackInfo);
    this.sendToWiFi(trackInfo);
  }

  /**
   * 发送歌词信息到 KDE Connect
   * @param trackInfo 当前播放信息
   */
  private sendToKDEConnect(trackInfo: any): void {
    const store = useStore();
    const externalLyricConfig = store.get("externalLyricProtocol") as ExternalLyricProtocolConfig;
    
    if (!externalLyricConfig?.kdeConnect) return;

    try {
      // KDE Connect 媒体播放器状态 - 确保格式符合 KDE Connect 标准
      const mediaMessage = JSON.stringify({
        id: Date.now().toString(),
        type: 'kdeconnect.mediaplayer',
        body: {
          action: 'update',
          player: {
            name: 'SPlayer',
            title: trackInfo.title || "未知歌曲",
            artist: trackInfo.artist || "未知艺术家",
            album: trackInfo.album || "未知专辑",
            duration: trackInfo.duration || 0,
            position: trackInfo.position || 0,
            isPlaying: trackInfo.isPlaying || false,
            // 歌词信息 - KDE Connect 可能需要特定格式
            metadata: {
              lyrics: trackInfo.currentLyric || "",
              currentLyric: trackInfo.currentLyric || "",
              nextLyric: trackInfo.nextLyric || ""
            },
            // 确保所有必要字段都存在
            capabilities: {
              canPlay: true,
              canPause: true,
              canGoNext: true,
              canGoPrevious: true,
              canSeek: true
            }
          }
        }
      });

      socketLog.log("Sending lyric info to KDE Connect:", {
        title: trackInfo.title,
        artist: trackInfo.artist,
        currentLyric: trackInfo.currentLyric
      });
      
      // 发送给所有连接的 KDE Connect 客户端
      for (const client of this.kdeConnectClients) {
        try {
          client.write(mediaMessage + '\n');
          socketLog.log('Successfully sent media info to KDE Connect client');
        } catch (error) {
          socketLog.error('Error sending to KDE Connect client:', error);
          this.kdeConnectClients.delete(client);
        }
      }
      
      if (this.kdeConnectClients.size > 0) {
        socketLog.log(`Sent media info to ${this.kdeConnectClients.size} KDE Connect clients`);
      } else {
        socketLog.warn('No KDE Connect clients connected');
      }
    } catch (error) {
      socketLog.error("Failed to send lyric info to KDE Connect:", error);
    }
  }

  /**
   * 发送歌词信息到蓝牙设备
   * @param _trackInfo 当前播放信息
   */
  private sendToBluetooth(_trackInfo: any): void {
    const store = useStore();
    const externalLyricConfig = store.get("externalLyricProtocol") as ExternalLyricProtocolConfig;
    
    if (!externalLyricConfig?.bluetooth) return;

    // 实现蓝牙歌词发送
    socketLog.log("Sending lyric info to Bluetooth device");
  }

  /**
   * 发送歌词信息到 WiFi 设备
   * @param trackInfo 当前播放信息
   */
  private sendToWiFi(trackInfo: any): void {
    const store = useStore();
    const externalLyricConfig = store.get("externalLyricProtocol") as ExternalLyricProtocolConfig;
    
    if (!externalLyricConfig?.wifi) return;

    try {
      const lyricMessage = {
        type: 'lyric',
        data: {
          title: trackInfo.title || "未知歌曲",
          artist: trackInfo.artist || "未知艺术家",
          album: trackInfo.album || "未知专辑",
          duration: trackInfo.duration || 0,
          position: trackInfo.position || 0,
          isPlaying: trackInfo.isPlaying || false,
          coverUrl: trackInfo.coverUrl || "",
          currentLyric: trackInfo.currentLyric || "",
          nextLyric: trackInfo.nextLyric || ""
        }
      };

      const messageString = JSON.stringify(lyricMessage);
      
      // 发送给所有连接的客户端
      for (const client of this.wifiClients) {
        if (client.readyState === 1) { // OPEN
          client.send(messageString);
        }
      }

      socketLog.log(`Sent lyric info to ${this.wifiClients.size} WiFi clients`);
    } catch (error) {
      socketLog.error("Failed to send lyric info to WiFi devices:", error);
    }
  }

  /**
   * 检查服务是否正在运行
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }
}
