import type { SongMetadata } from "@native/tools";
import { app, BrowserWindow } from "electron";
import { mkdir, access, writeFile, rename, unlink } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join, resolve } from "node:path";
import { ipcLog } from "../logger";
import { useStore } from "../store";
import { loadNativeModule } from "../utils/native-loader";
import { getArtistNames } from "../utils/format";
import https from "node:https";
import http from "node:http";

type toolModule = typeof import("@native/tools");
const tools: toolModule = loadNativeModule("tools.node", "tools");

export class DownloadService {
  /** 存储活动下载任务：ID -> DownloadTask 实例 */
  private activeDownloads = new Map<number, any>();

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
      const basePath = resolve(path);
      // 为每个歌曲创建单独的文件夹
      const songFolderPath = join(basePath, fileName);
      // 检查文件夹是否存在，不存在则自动递归创建
      try {
        await access(songFolderPath);
      } catch {
        await mkdir(songFolderPath, { recursive: true });
      }
      // 规范化文件名
      const finalFilePath = fileType
        ? join(songFolderPath, `${fileName}.${fileType}`)
        : join(songFolderPath, fileName);
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
      const tempDir = join(basePath, ".splayer_temp");
      try {
        await access(tempDir);
      } catch {
        await mkdir(tempDir, { recursive: true });
      }
      const tempFileName = fileType ? `${fileName}.${fileType}` : fileName;
      const tempFilePath = join(tempDir, tempFileName);
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
      // 如果启用了 HTTP/2，将 HTTP 升级到 HTTPS（HTTP/2 通常需要 HTTPS）
      let finalUrl = url;
      
      // 尝试使用 native tools 下载
      if (tools && tools.DownloadTask) {
        ipcLog.info(`📥 Using native downloader for: ${finalUrl}`);
        // 使用 threadCount（如果可用），否则回退到 store
        const threadCount = options.threadCount || store.get("downloadThreadCount") || 8;
        // 使用 enableDownloadHttp2（如果可用），否则回退到 store
        const enableHttp2 = options.enableDownloadHttp2 ?? store.get("enableDownloadHttp2", true);
        // 如果启用了 HTTP/2，将 HTTP 升级到 HTTPS
        if (enableHttp2 && finalUrl.startsWith("http://")) {
          finalUrl = finalUrl.replace(/^http:\/\//, "https://");
          ipcLog.info(`🔒 Upgraded download URL to HTTPS for HTTP/2 support: ${finalUrl}`);
        }
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
        } catch (err) {
          // 下载失败或取消，尝试清理临时文件
          try {
            await unlink(tempFilePath);
          } catch {
            // 忽略清理错误
          }
          throw err;
        } finally {
          this.activeDownloads.delete(downloadId);
        }
      } else {
        // Fallback: 使用 Node.js 内置模块下载
        ipcLog.info(`📥 Using fallback downloader for: ${finalUrl}`);
        await this.fallbackDownload(
          finalUrl,
          tempFilePath,
          finalFilePath,
          metadata,
          onProgress,
          referer
        );
      }

      // 创建同名歌词文件
      ipcLog.info(`📝 Lyric creation check: lyric=${!!lyric}, downloadLyric=${downloadLyric}, lyric length=${lyric?.length || 0}`);
      if (lyric && downloadLyric) {
        const lrcPath = join(songFolderPath, `${fileName}.lrc`);
        await writeFile(lrcPath, lyric, "utf-8");
        ipcLog.info(`📝 Created lyric file: ${lrcPath}`);
      } else {
        if (!downloadLyric) {
          ipcLog.info(`📝 Skipped lyric creation: downloadLyric is false`);
        } else if (!lyric) {
          ipcLog.info(`📝 Skipped lyric creation: lyric is empty or null`);
        } else if (lyric.length === 0) {
          ipcLog.info(`📝 Skipped lyric creation: lyric is empty string`);
        }
      }

      // 下载封面文件
      if (downloadCover && songData?.coverSize?.l) {
        const coverPath = join(songFolderPath, `${fileName}.jpg`);
        try {
          await this.downloadCover(songData.coverSize.l, coverPath, referer);
          ipcLog.info(`🖼️ Downloaded cover file: ${coverPath}`);
        } catch (error) {
          ipcLog.warn(`⚠️ Failed to download cover: ${error}`);
        }
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
   * 取消下载
   * @param songId 歌曲ID
   * @returns 是否成功取消
   */
  cancelDownload(songId: number): boolean {
    const task = this.activeDownloads.get(songId);
    if (task) {
      task.cancel();
      return true;
    }
    return false;
  }

  /**
   * Fallback 下载方法 - 使用 Node.js 内置模块
   */
  private async fallbackDownload(
    url: string,
    tempFilePath: string,
    finalFilePath: string,
    _metadata: any,
    onProgress: (data: any) => void,
    referer?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https://') ? https : http;
      const request = protocol.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...(referer && { 'Referer': referer })
        }
      }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP error! status: ${response.statusCode}`));
          return;
        }

        const contentLength = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;

        const fileStream = createWriteStream(tempFilePath);

        response.on('data', (chunk) => {
          fileStream.write(chunk);
          downloaded += chunk.length;
          
          if (contentLength > 0) {
            const percent = (downloaded / contentLength) * 100;
            onProgress({ percent, transferredBytes: downloaded, totalBytes: contentLength });
          }
        });

        response.on('end', async () => {
          fileStream.end();
          try {
            await rename(tempFilePath, finalFilePath);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });

      request.on('error', (err) => {
        reject(err);
      });

      request.setTimeout(60000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * 下载封面文件
   */
  private async downloadCover(
    coverUrl: string,
    coverPath: string,
    referer?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = coverUrl.startsWith('https://') ? https : http;
      const request = protocol.get(coverUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...(referer && { 'Referer': referer })
        }
      }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP error! status: ${response.statusCode}`));
          return;
        }

        const fileStream = createWriteStream(coverPath);

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

      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('Cover download timeout'));
      });
    });
  }
}
