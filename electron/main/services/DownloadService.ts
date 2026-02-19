import type { SongMetadata } from "@native/tools";
import { app, BrowserWindow } from "electron";
import { mkdir, access, writeFile, rename, unlink, rm } from "node:fs/promises";
import * as fs from "node:fs";
import { join, resolve } from "node:path";
import { ipcLog } from "../logger";
import { useStore } from "../store";
import { loadNativeModule } from "../utils/native-loader";
import { getArtistNames } from "../utils/format";
import https from "node:https";
import http from "node:http";

interface toolModule {
  DownloadTask: any;
  writeMusicMetadata?: (filePath: string, metadata: any, coverPath?: string) => Promise<void>;
}

const tools = loadNativeModule("tools.node", "tools") as toolModule | null;

export class DownloadService {
  /** 存储活动下载任务：ID -> DownloadTask 实例 */
  private activeDownloads = new Map<number, any>();
  /** 存储下载任务的临时文件路径：ID -> 临时文件路径 */
  private tempFilePaths = new Map<number, string>();
  /** 存储下载任务的临时文件夹路径：ID -> 临时文件夹路径 */
  private tempDirPaths = new Map<number, string>();

  /**
   * 处理文件下载请求
   * @param event IPC 调用事件
   * @param url 下载链接
   * @param options 下载选项
   * @returns 下载结果状态
   */
  async downloadFile(
    event: Electron.IpcMainInvokeEvent,
    url: string,
    options: {
      fileName: string;
      fileType: string;
      path: string;
      downloadMeta?: boolean;
      downloadCover?: boolean;
      downloadAnimatedCover?: boolean;
      downloadLyric?: boolean;
      saveMetaFile?: boolean;
      lyric?: string;
      songData?: any;
      skipIfExist?: boolean;
      threadCount?: number;
      referer?: string;
      enableDownloadHttp2?: boolean;
    } = {
      fileName: "未知文件名",
      fileType: "mp3",
      path: app.getPath("downloads"),
    },
  ): Promise<{ status: "success" | "skipped" | "error" | "cancelled"; message?: string }> {
    try {
      // 获取窗口
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win || !win.webContents) return { status: "error", message: "Window not found" };
      // 获取配置
      const {
        fileName,
        fileType,
        path,
        lyric,
        downloadMeta,
        downloadCover,
        downloadLyric,
        songData,
        skipIfExist,
        referer,
      } = options;
      // 规范化路径
      const downloadPath = resolve(path);
      // 构建文件夹结构：歌手名文件夹\歌曲名文件夹
      let finalDownloadPath = downloadPath;
      if (songData) {
        // 获取歌手名
        let artistName = "未知歌手";
        if (songData.artists && Array.isArray(songData.artists)) {
          artistName = songData.artists.map((artist: any) => artist.name || artist).join("&");
        } else if (songData.artist) {
          artistName = songData.artist;
        } else if (songData.ar && Array.isArray(songData.ar)) {
          artistName = songData.ar.map((artist: any) => artist.name || artist).join("&");
        }
        // 清理文件名中的非法字符
        const safeArtistName = artistName.replace(/[/:*?"<>|]/g, "&");
        const safeFileName = fileName.replace(/[/:*?"<>|]/g, "&");
        // 构建最终路径
        finalDownloadPath = join(downloadPath, safeArtistName, safeFileName);
        // 确保目录存在
        await mkdir(finalDownloadPath, { recursive: true });
      }
      // 构建最终文件路径
      const finalFilePath = fileType
        ? join(finalDownloadPath, `${fileName}.${fileType}`)
        : join(finalDownloadPath, fileName);
      // 检查文件是否存在
      if (skipIfExist) {
        try {
          await access(finalFilePath);
          return { status: "skipped", message: "文件已存在" };
        } catch {
          // 文件不存在，继续下载
        }
      }
      // 使用隐藏的临时文件夹来避免扫描
      const tempDir = join(downloadPath, ".splayer_temp");
      try {
        await access(tempDir);
      } catch {
        await mkdir(tempDir, { recursive: true });
      }
      const tempFileName = fileType ? `${fileName}.${fileType}` : fileName;
      const tempFilePath = join(tempDir, tempFileName);
      
      // 保存临时文件和文件夹路径
      const downloadId = songData?.id || 0;
      this.tempFilePaths.set(downloadId, tempFilePath);
      this.tempDirPaths.set(downloadId, tempDir);
      // 准备元数据
      let metadata: SongMetadata | undefined | null = null;
      if (downloadMeta && songData) {
        const artistNames = getArtistNames(songData.artists);
        const artist = artistNames.join(", ") || "未知艺术家";
        const coverUrl =
          downloadCover && (songData.coverSize?.l || songData.cover)
            ? songData.coverSize?.l || songData.cover
            : undefined;
        metadata = {
          title: songData.name || "未知曲目",
          artist: artist,
          album:
            (typeof songData.album === "string" ? songData.album : songData.album?.name) ||
            "未知专辑",
          coverUrl: coverUrl,
          lyric: downloadLyric && lyric ? lyric : undefined,
          description: songData.alia || "",
        };
      }
      // 进度回调
      const onProgress = (...args: any[]) => {
        let progressData: any;
        // 处理 (err, value) 或 (value) 签名
        if (args.length > 1 && args[0] === null) {
          progressData = args[1];
        } else if (args.length > 0) {
          progressData = args[0];
        }
        // 处理进度数据
        try {
          if (!progressData) return;
          // 处理对象（新）和 JSON 字符串（旧/回退）
          if (typeof progressData === "string") {
            try {
              progressData = JSON.parse(progressData);
            } catch (e) {
              console.error("Failed to parse progress json", e);
              return;
            }
          }
          // 检查进度数据
          if (!progressData || typeof progressData !== "object") return;
          // 映射 snake_case（Rust）到 camelCase（JS）
          // Rust struct: { percent, transferred_bytes, total_bytes }
          const percent = progressData.percent;
          const transferredBytes =
            progressData.transferredBytes ?? progressData.transferred_bytes ?? 0;
          const totalBytes = progressData.totalBytes ?? progressData.total_bytes ?? 0;
          // 发送进度更新
          win.webContents.send("download-progress", {
            id: songData?.id,
            percent: percent,
            transferredBytes: transferredBytes,
            totalBytes: totalBytes,
          });
        } catch (e) {
          console.error("Error processing progress callback", e, "Args:", args);
        }
      };
      // 获取配置
      const store = useStore();
      // 使用 threadCount（如果可用），否则回退到 store
      const threadCount = options.threadCount || store.get("downloadThreadCount") || 8;
      // 使用 enableDownloadHttp2（如果可用），否则回退到 store
      const enableHttp2 = options.enableDownloadHttp2 ?? store.get("enableDownloadHttp2", true);
      // 下载动态封面
      const animatedCoverEnabled = options.downloadAnimatedCover ?? store.get("downloadAnimatedCover", false);
      // 如果启用了 HTTP/2，将 HTTP 升级到 HTTPS（HTTP/2 通常需要 HTTPS）
      let finalUrl = url;
      if (enableHttp2 && finalUrl.startsWith("http://")) {
        finalUrl = finalUrl.replace(/^http:\/\//, "https://");
        ipcLog.info(`🔒 Upgraded download URL to HTTPS for HTTP/2 support: ${finalUrl}`);
      }
      // 下载完成后重命名为最终文件名
        if (tools) {
          // 使用原生模块下载
          // 创建下载任务
          const task = new tools.DownloadTask();
          const downloadId = songData?.id || 0;
          this.activeDownloads.set(downloadId, task);

          try {
            // 下载到临时文件
            await task.download(
              finalUrl,
              tempFilePath,
              metadata,
              threadCount,
              referer,
              onProgress,
              enableHttp2,
            );
            // 下载完成后重命名为最终文件名
            await rename(tempFilePath, finalFilePath);
            // 清理临时文件夹
            try {
              await unlink(tempFilePath);
            } catch {
              // 忽略清理错误
            }
            try {
              await rm(tempDir, { recursive: true, force: true });
            } catch {
              // 忽略清理错误
            }
          } catch (err) {
            // 下载失败或取消，尝试清理临时文件
            try {
              await unlink(tempFilePath);
            } catch {
              // 忽略清理错误
            }
            try {
              await rm(tempDir, { recursive: true, force: true });
            } catch {
              // 忽略清理错误
            }
            throw err;
          } finally {
            // 清理所有相关记录
            this.activeDownloads.delete(downloadId);
            this.tempFilePaths.delete(downloadId);
            this.tempDirPaths.delete(downloadId);
          }
        } else {
          // 使用 Node.js 内置模块作为 fallback
          try {
            await this.fallbackDownload(finalUrl, tempFilePath, onProgress, referer);
            // 下载完成后重命名为最终文件名
            await rename(tempFilePath, finalFilePath);
            
            // 写入元数据（如果启用且有原生模块）
            if (downloadMeta && songData && tools) {
              // 使用类型断言避免TypeScript编译错误
              const toolsWithMetadata = tools as any;
              if (toolsWithMetadata.writeMusicMetadata) {
                const artistNames = getArtistNames(songData.artists);
                const artist = artistNames.join(", ") || "未知艺术家";
                const meta = {
                  title: songData.name || "未知曲目",
                  artist: artist,
                  album: (typeof songData.album === "string" ? songData.album : songData.album?.name) || "未知专辑",
                  lyric: downloadLyric && lyric ? lyric : undefined,
                  description: songData.alia || "",
                };
                
                // 下载封面
                let coverPath: string | undefined;
                if (downloadCover && (songData.coverSize?.l || songData.cover)) {
                  const coverUrl = songData.coverSize?.l || songData.cover;
                  coverPath = join(finalDownloadPath, `${fileName}.jpg`);
                  await this.downloadCover(coverUrl, coverPath, referer);
                }
                
                // 下载动态封面
                if (downloadCover && animatedCoverEnabled && songData && songData.animatedCoverUrl) {
                  const animatedCoverUrl = songData.animatedCoverUrl;
                  // 从URL中提取文件扩展名
                  let fileExt = '.gif'; // 默认使用gif
                  const extMatch = animatedCoverUrl.match(/\.([^.]+)(?:[?#]|$)/i);
                  if (extMatch) {
                    fileExt = `.${extMatch[1].toLowerCase()}`;
                  }
                  const animatedCoverPath = join(finalDownloadPath, `${fileName}${fileExt}`);
                  await this.downloadCover(animatedCoverUrl, animatedCoverPath, referer);
                }
                
                // 写入元数据
                await toolsWithMetadata.writeMusicMetadata(finalFilePath, meta, coverPath);
              }
            }
          } catch (err) {
            // 下载失败或取消，尝试清理临时文件
            try {
              await unlink(tempFilePath);
            } catch {
              // 忽略清理错误
            }
            try {
              await rm(tempDir, { recursive: true, force: true });
            } catch {
              // 忽略清理错误
            }
            throw err;
          } finally {
            // 清理所有相关记录
            const downloadId = songData?.id || 0;
            this.activeDownloads.delete(downloadId);
            this.tempFilePaths.delete(downloadId);
            this.tempDirPaths.delete(downloadId);
          }
        }

      // 下载封面文件
      if (downloadMeta && downloadCover && songData && (songData.coverSize?.l || songData.cover)) {
        const coverUrl = songData.coverSize?.l || songData.cover;
        const coverPath = join(finalDownloadPath, `${fileName}.jpg`);
        // 检查封面文件是否存在
        try {
          await access(coverPath);
          // 封面文件已存在，跳过下载
        } catch {
          // 封面文件不存在，下载
          await this.downloadCover(coverUrl, coverPath, referer);
        }
      }

      // 下载动态封面文件
      if (downloadMeta && downloadCover && animatedCoverEnabled && songData && songData.animatedCoverUrl) {
        const animatedCoverUrl = songData.animatedCoverUrl;
        // 从URL中提取文件扩展名
        let fileExt = '.gif'; // 默认使用gif
        const extMatch = animatedCoverUrl.match(/\.([^.]+)(?:[?#]|$)/i);
        if (extMatch) {
          fileExt = `.${extMatch[1].toLowerCase()}`;
        }
        const animatedCoverPath = join(finalDownloadPath, `${fileName}${fileExt}`);
        // 检查动态封面文件是否存在
        try {
          await access(animatedCoverPath);
          // 动态封面文件已存在，跳过下载
        } catch {
          // 动态封面文件不存在，下载
          await this.downloadCover(animatedCoverUrl, animatedCoverPath, referer);
        }
      }

      // 创建同名歌词文件
      if (lyric && downloadLyric) {
        const lrcPath = join(finalDownloadPath, `${fileName}.lrc`);
        await writeFile(lrcPath, lyric, "utf-8");
      }

      return { status: "success" };
    } catch (error: any) {
      ipcLog.error("❌ Error downloading file:", error);
      if ((error.message && error.message.includes("cancelled")) || error.code === "Cancelled") {
        return { status: "cancelled", message: "下载已取消" };
      }
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 使用 Node.js 内置模块下载文件（fallback）
   */
  private async fallbackDownload(url: string, filePath: string, onProgress: (data: any) => void, referer?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https://') ? https : http;
      const request = protocol.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
          'Referer': referer || 'https://music.163.com',
        },
      }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP error ${response.statusCode}`));
          return;
        }

        const contentLength = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;

        const fileStream = fs.createWriteStream(filePath);
        response.pipe(fileStream);

        response.on('data', (chunk) => {
          downloaded += chunk.length;
          const percent = contentLength ? (downloaded / contentLength) * 100 : 0;
          onProgress({
            percent: percent,
            transferredBytes: downloaded,
            totalBytes: contentLength,
          });
        });

        fileStream.on('finish', () => {
          onProgress({
            percent: 100,
            transferredBytes: downloaded,
            totalBytes: contentLength,
          });
          resolve();
        });

        fileStream.on('error', (err) => {
          reject(err);
        });
      });

      request.on('error', (err) => {
        reject(err);
      });

      request.end();
    });
  }

  /**
   * 下载封面文件
   */
  private async downloadCover(url: string, filePath: string, referer?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https://') ? https : http;
      const request = protocol.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
          'Referer': referer || 'https://music.163.com',
        },
      }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP error ${response.statusCode}`));
          return;
        }

        const fileStream = fs.createWriteStream(filePath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          resolve();
        });

        fileStream.on('error', (err) => {
          reject(err);
        });
      });

      request.on('error', (err) => {
        reject(err);
      });

      request.end();
    });
  }

  /**
   * 取消下载
   * @param songId 歌曲ID
   * @returns 是否成功取消
   */
  async cancelDownload(songId: number): Promise<boolean> {
    const task = this.activeDownloads.get(songId);
    if (task) {
      task.cancel();
      
      // 清理临时文件和文件夹
      await this.cleanupTempFiles(songId);
      
      // 全局清理所有 .splayer_temp 文件夹
      await this.cleanupAllSplayerTempFolders();
      
      return true;
    }
    return false;
  }
  
  /**
   * 清理临时文件和文件夹
   * @param songId 歌曲ID
   */
  private async cleanupTempFiles(songId: number): Promise<void> {
    try {
      // 清理临时文件
      const tempFilePath = this.tempFilePaths.get(songId);
      if (tempFilePath) {
        try {
          await unlink(tempFilePath);
          ipcLog.info(`🧹 Cleaned temp file: ${tempFilePath}`);
        } catch (error) {
          ipcLog.warn(`⚠️ Failed to clean temp file: ${tempFilePath}`, error);
        }
        this.tempFilePaths.delete(songId);
      }
      
      // 清理临时文件夹
      const tempDirPath = this.tempDirPaths.get(songId);
      if (tempDirPath) {
        try {
          await rm(tempDirPath, { recursive: true, force: true });
          ipcLog.info(`🧹 Cleaned temp dir: ${tempDirPath}`);
        } catch (error) {
          ipcLog.warn(`⚠️ Failed to clean temp dir: ${tempDirPath}`, error);
        }
        this.tempDirPaths.delete(songId);
      }
      
      // 从活动下载中移除
      this.activeDownloads.delete(songId);
    } catch (error) {
      ipcLog.error("Error cleaning up temp files:", error);
    }
  }
  
  /**
   * 清理所有临时文件和文件夹
   */
  public async cleanupAllTempFiles(): Promise<void> {
    try {
      // 清理所有临时文件
      for (const [, tempFilePath] of this.tempFilePaths.entries()) {
        try {
          await unlink(tempFilePath);
          ipcLog.info(`🧹 Cleaned temp file: ${tempFilePath}`);
        } catch (error) {
          ipcLog.warn(`⚠️ Failed to clean temp file: ${tempFilePath}`, error);
        }
      }
      this.tempFilePaths.clear();
      
      // 清理所有临时文件夹
      for (const [, tempDirPath] of this.tempDirPaths.entries()) {
        try {
          await rm(tempDirPath, { recursive: true, force: true });
          ipcLog.info(`🧹 Cleaned temp dir: ${tempDirPath}`);
        } catch (error) {
          ipcLog.warn(`⚠️ Failed to clean temp dir: ${tempDirPath}`, error);
        }
      }
      this.tempDirPaths.clear();
      
      // 清空活动下载
      this.activeDownloads.clear();
    } catch (error) {
      ipcLog.error("Error cleaning up all temp files:", error);
    }
  }

  /**
   * 全局清理所有 .splayer_temp 文件夹
   * @param basePath 基础路径
   */
  public async cleanupAllSplayerTempFolders(basePath?: string): Promise<void> {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // 搜索并清理所有 .splayer_temp 文件夹
      const searchAndClean = async (dir: string) => {
        try {
          const files = await fs.promises.readdir(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = await fs.promises.stat(fullPath);
            
            if (stat.isDirectory()) {
              if (file === '.splayer_temp') {
                // 清理临时文件夹
                try {
                  await fs.promises.rm(fullPath, { recursive: true, force: true });
                  ipcLog.info(`🧹 Globally cleaned temp dir: ${fullPath}`);
                } catch (error) {
                  ipcLog.warn(`⚠️ Failed to clean global temp dir: ${fullPath}`, error);
                }
              } else {
                // 递归搜索
                await searchAndClean(fullPath);
              }
            }
          }
        } catch (error) {
          // 忽略权限错误等
        }
      };
      
      // 从多个可能的位置开始搜索
      const searchPaths = [
        basePath,
        app.getPath('downloads'),
        app.getPath('desktop')
      ].filter(Boolean) as string[];
      
      for (const searchPath of searchPaths) {
        await searchAndClean(searchPath);
      }
    } catch (error) {
      ipcLog.error("Error cleaning up all splayer temp folders:", error);
    }
  }
}
