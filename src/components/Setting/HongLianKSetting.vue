<template>
  <div class="setting-type">
    <div class="set-list">
      <n-h3 prefix="bar">
        <span>红联K</span>
        <n-tag size="small" type="warning" round style="margin-left: 8px">
          实验性功能
        </n-tag>
        <n-tooltip placement="top" trigger="hover">
          <template #trigger>
            <n-button
              quaternary
              circle
              size="small"
              style="margin-left: 8px"
            >
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="n-icon"><path d="M12 9v2m0 4h.01"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>
              </template>
            </n-button>
          </template>
          <span>红联K功能正在开发中，使用过程中可能会遇到问题，请谨慎使用。</span>
        </n-tooltip>
      </n-h3>
      <n-alert
        title="免责声明"
        type="warning"
        :bordered="false"
        :closable="false"
        style="margin-bottom: 16px"
      >
        <n-text depth="3">
          使用红联K功能即表示您同意以下条款：
        </n-text>
        <ul style="margin: 8px 0 0 0; padding-left: 20px">
          <li>红联K为实验性功能，可能存在稳定性问题</li>
          <li>用户添加的API服务由用户自行负责</li>
          <li>请确保使用的API服务符合相关法律法规</li>
          <li>系统不对第三方API的可用性和安全性负责</li>
        </ul>
      </n-alert>
      <n-card class="set-item">
        <n-text depth="3">红联K是一个额外功能，目前正在开发中...</n-text>
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> API配置与服务管理 </n-h3>
      <n-card class="set-item">
        <!-- 整合按钮 -->
        <n-flex justify="center" style="margin-bottom: 16px">
          <n-button
            type="primary"
            strong
            @click="openApiManager"
          >
            🔧 配置管理
          </n-button>
        </n-flex>
        <n-text depth="3" style="text-align: center; margin-bottom: 16px">
          点击上方按钮管理所有API配置和服务状态
        </n-text>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, Ref } from "vue";
import { useSettingStore } from "@/stores";

const settingStore = useSettingStore();

// API配置
const neteaseApi = ref(settingStore.neteaseApi || '');
const kugouApi = ref(settingStore.kugouApi || '');
const qqApi = ref(settingStore.qqApi || '');
const extraApi = ref(settingStore.extraApi || '');
// 优先搜索源
const prioritySearchSource = ref(settingStore.prioritySearchSource || 'auto');
// 资源源设置
const resourceSources = ref(settingStore.resourceSources || {
  download: 'auto',
  playback: 'auto',
  lyric: 'auto',
  cover: 'auto',
  playlist: 'auto',
  comment: 'auto',
  mv: 'auto'
});

// 服务状态和延迟
interface ServiceStatus {
  status: boolean;
  delay: number;
}

interface Services {
  netease: ServiceStatus;
  kugou: ServiceStatus;
  qq: ServiceStatus;
  extra: ServiceStatus;
}

// 自带服务
const builtinServices = ref<Services>({
  netease: { status: true, delay: 0 },
  kugou: { status: true, delay: 0 },
  qq: { status: true, delay: 0 },
  extra: { status: false, delay: 0 }
});

// 用户添加服务
const userServices = ref<Services>({
  netease: { status: false, delay: 0 },
  kugou: { status: false, delay: 0 },
  qq: { status: false, delay: 0 },
  extra: { status: false, delay: 0 }
});

// 延迟监控数据
interface DelayDataPoint {
  time: number;
  delay: number;
}

const neteaseDelayData = ref<DelayDataPoint[]>([]);
const kugouDelayData = ref<DelayDataPoint[]>([]);
const qqDelayData = ref<DelayDataPoint[]>([]);
const extraDelayData = ref<DelayDataPoint[]>([]);
const maxDelayDataPoints = 30; // 最多保存30个数据点（30秒）

// 图表引用
const neteaseDelayChart = ref<HTMLCanvasElement | null>(null);
const kugouDelayChart = ref<HTMLCanvasElement | null>(null);
const qqDelayChart = ref<HTMLCanvasElement | null>(null);
const extraDelayChart = ref<HTMLCanvasElement | null>(null);

// 延迟统计数据
interface DelayStats {
  avg: number;
  min: number;
  max: number;
}

const neteaseStats = ref<DelayStats>({ avg: 0, min: 0, max: 0 });
const kugouStats = ref<DelayStats>({ avg: 0, min: 0, max: 0 });
const qqStats = ref<DelayStats>({ avg: 0, min: 0, max: 0 });
const extraStats = ref<DelayStats>({ avg: 0, min: 0, max: 0 });

// 实时检测定时器
const realTimeCheckTimer = ref<number | null>(null);
// API切换锁，防止频繁切换导致的跳转问题
let apiSwitching = false;



// 实时检测延迟
const checkRealTimeDelay = () => {
  window.$message.info("正在实时检测服务延迟...");
  
  // 立即检测一次
  performRealDelayCheck();
  
  // 清除之前的定时器
  if (realTimeCheckTimer.value) {
    clearInterval(realTimeCheckTimer.value);
  }
  
  // 每1秒检测一次（不限时间）
  realTimeCheckTimer.value = window.setInterval(() => {
    performRealDelayCheck();
  }, 1000);
};

// 执行真实延迟检测
const performRealDelayCheck = async () => {
  try {
    // 检测自带服务延迟（仅当未设置用户API时）
    if (!neteaseApi.value) {
      await checkServiceDelay('netease', builtinServices.value.netease, 'https://music.163.com');
    }
    if (!kugouApi.value) {
      await checkServiceDelay('kugou', builtinServices.value.kugou, 'https://www.kugou.com');
    }
    if (!qqApi.value) {
      await checkServiceDelay('qq', builtinServices.value.qq, 'https://y.qq.com');
    }
    
    // 检测用户服务延迟
    if (neteaseApi.value) {
      const isUserServiceAvailable = await checkServiceDelay('netease', userServices.value.netease, neteaseApi.value);
      if (!isUserServiceAvailable) {
        // 用户API不可用时，确保状态正确
        userServices.value.netease.status = false;
        userServices.value.netease.delay = 0;
      }
    } else {
      userServices.value.netease.status = false;
      userServices.value.netease.delay = 0;
    }
    
    if (kugouApi.value) {
      const isUserServiceAvailable = await checkServiceDelay('kugou', userServices.value.kugou, kugouApi.value);
      if (!isUserServiceAvailable) {
        // 用户API不可用时，确保状态正确
        userServices.value.kugou.status = false;
        userServices.value.kugou.delay = 0;
      }
    } else {
      userServices.value.kugou.status = false;
      userServices.value.kugou.delay = 0;
    }
    
    if (qqApi.value) {
      const isUserServiceAvailable = await checkServiceDelay('qq', userServices.value.qq, qqApi.value);
      if (!isUserServiceAvailable) {
        // 用户API不可用时，确保状态正确
        userServices.value.qq.status = false;
        userServices.value.qq.delay = 0;
      }
    } else {
      userServices.value.qq.status = false;
      userServices.value.qq.delay = 0;
    }
    
    // 检测备用网易云API延迟
    if (extraApi.value) {
      const isUserServiceAvailable = await checkServiceDelay('extra', userServices.value.extra, extraApi.value);
      if (!isUserServiceAvailable) {
        // 用户API不可用时，确保状态正确
        userServices.value.extra.status = false;
        userServices.value.extra.delay = 0;
      }
    } else {
      userServices.value.extra.status = false;
      userServices.value.extra.delay = 0;
    }
    
    // 更新延迟数据和图表
    updateDelayData();
    // 更新所有图表
    updateAllDelayCharts();
  } catch (error) {
    console.error('延迟检测失败:', error);
    // 即使出错，也更新延迟数据，确保显示最新状态
    updateDelayData();
    // 更新所有图表
    updateAllDelayCharts();
  }
};

// 停止实时检测延迟
const stopRealTimeDelay = () => {
  if (realTimeCheckTimer.value) {
    clearInterval(realTimeCheckTimer.value);
    realTimeCheckTimer.value = null;
    window.$message.success("实时延迟检测已停止");
  }
};

// 保存API配置
const saveApiConfig = async () => {
  // 保存到设置
  settingStore.neteaseApi = neteaseApi.value;
  settingStore.kugouApi = kugouApi.value;
  settingStore.qqApi = qqApi.value;
  settingStore.extraApi = extraApi.value;
  
  // 保存优先搜索源
  settingStore.prioritySearchSource = prioritySearchSource.value;
  
  // 保存资源源设置
  settingStore.resourceSources = resourceSources.value;
  
  // 应用API切换
  await applyApiSwitching();
  
  // 立即检测延迟，确保用户添加服务时能够及时显示备用网易云API的延迟信息
  await performRealDelayCheck();
  
  window.$message.success("API配置保存成功");
};

// 应用API切换
const applyApiSwitching = async () => {
  if (apiSwitching) return;
  
  apiSwitching = true;
  
  try {
    // 先执行一次延迟检测，确保服务状态是最新的
    await performRealDelayCheck();
    
    // 网易云音乐API切换
    if (neteaseApi.value) {
      // 如果设置了用户API，无论状态如何，都禁用内置服务
      // 这样可以确保内置服务被正确切断
      builtinServices.value.netease.status = false;
    } else {
      // 如果没有设置用户API，启用内置服务
      builtinServices.value.netease.status = true;
    }
    
    // 酷狗音乐API切换
    if (kugouApi.value) {
      // 如果设置了用户API，无论状态如何，都禁用内置服务
      builtinServices.value.kugou.status = false;
    } else {
      // 如果没有设置用户API，启用内置服务
      builtinServices.value.kugou.status = true;
    }
    
    // QQ音乐API切换
    if (qqApi.value) {
      // 如果设置了用户API，无论状态如何，都禁用内置服务
      builtinServices.value.qq.status = false;
    } else {
      // 如果没有设置用户API，启用内置服务
      builtinServices.value.qq.status = true;
    }
    
    // 备用网易云API切换
    // 备用网易云API作为独立服务，不需要禁用内置服务
    // 但需要确保其状态正确更新
    if (extraApi.value) {
      // 检查备用网易云API是否可用
      if (userServices.value.extra.status) {
        console.log('备用网易云API已启用且可用');
      } else {
        console.log('备用网易云API已配置但不可用');
      }
    } else {
      // 未设置备用网易云API
      userServices.value.extra.status = false;
      userServices.value.extra.delay = 0;
    }
  } finally {
    // 延迟解锁，防止频繁切换
    setTimeout(() => {
      apiSwitching = false;
    }, 2000);
  }
};

// 检测单个服务的延迟
const checkServiceDelay = async (_service: string, serviceStatus: ServiceStatus, url: string): Promise<boolean> => {
  try {
    // 确保URL格式正确
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      // 尝试添加https前缀
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    const startTime = Date.now();
    
    // 发送HEAD请求获取响应时间
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      await fetch(normalizedUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });
    } catch (headError) {
      // HEAD请求失败，尝试GET请求
      try {
        await fetch(normalizedUrl, {
          method: 'GET',
          mode: 'no-cors',
          signal: controller.signal
        });
      } catch (getError) {
        // GET请求也失败，尝试添加/api路径
        try {
          const apiUrl = normalizedUrl.endsWith('/') ? normalizedUrl + 'api' : normalizedUrl + '/api';
          await fetch(apiUrl, {
            method: 'GET',
            mode: 'no-cors',
            signal: controller.signal
          });
        } catch (apiError) {
          // 所有请求都失败，抛出错误
          throw apiError;
        }
      }
    }
    
    clearTimeout(timeoutId);
    
    const endTime = Date.now();
    const delay = endTime - startTime;
    
    // 更新服务状态
    serviceStatus.status = true;
    serviceStatus.delay = delay;
    
    return true;
  } catch (error) {
    // 请求失败，服务不可用
    serviceStatus.status = false;
    serviceStatus.delay = 0;
    return false;
  }
};

// 更新延迟数据
const updateDelayData = () => {
  // 更新网易云音乐延迟数据
  updateServiceDelayData('netease');
  // 更新酷狗音乐延迟数据
  updateServiceDelayData('kugou');
  // 更新QQ音乐延迟数据
  updateServiceDelayData('qq');
  // 更新备用网易云API延迟数据
  updateServiceDelayData('extra');
};

// 更新单个服务的延迟数据
const updateServiceDelayData = (service: string) => {
  let delay: number;
  let delayData: Ref<DelayDataPoint[]>;
  let stats: Ref<DelayStats>;
  let chartRef: Ref<HTMLCanvasElement | null>;
  let hasUserApi: boolean;
  
  // 根据服务类型选择对应的数据
  switch (service) {
    case 'netease':
      hasUserApi = !!neteaseApi.value;
      // 只有当用户添加了API且API可用时，才使用用户服务的延迟数据
      // 否则使用官方服务的延迟数据
      if (hasUserApi && userServices.value.netease.status) {
        delay = userServices.value.netease.delay;
      } else {
        delay = builtinServices.value.netease.delay;
      }
      delayData = neteaseDelayData;
      stats = neteaseStats;
      chartRef = neteaseDelayChart;
      break;
    case 'kugou':
      hasUserApi = !!kugouApi.value;
      // 只有当用户添加了API且API可用时，才使用用户服务的延迟数据
      // 否则使用官方服务的延迟数据
      if (hasUserApi && userServices.value.kugou.status) {
        delay = userServices.value.kugou.delay;
      } else {
        delay = builtinServices.value.kugou.delay;
      }
      delayData = kugouDelayData;
      stats = kugouStats;
      chartRef = kugouDelayChart;
      break;
    case 'qq':
      hasUserApi = !!qqApi.value;
      // 只有当用户添加了API且API可用时，才使用用户服务的延迟数据
      // 否则使用官方服务的延迟数据
      if (hasUserApi && userServices.value.qq.status) {
        delay = userServices.value.qq.delay;
      } else {
        delay = builtinServices.value.qq.delay;
      }
      delayData = qqDelayData;
      stats = qqStats;
      chartRef = qqDelayChart;
      break;
    case 'extra':
      hasUserApi = !!extraApi.value;
      // 只有当用户添加了备用网易云API且API可用时，才使用用户服务的延迟数据
      if (hasUserApi && userServices.value.extra.status) {
        delay = userServices.value.extra.delay;
      } else {
        delay = 0;
      }
      delayData = extraDelayData;
      stats = extraStats;
      chartRef = extraDelayChart;
      break;
    default:
      return;
  }
  
  // 添加新数据点
  delayData.value.push({
    time: Date.now(),
    delay
  });
  
  // 限制数据点数量
  if (delayData.value.length > maxDelayDataPoints) {
    delayData.value.shift();
  }
  
  // 更新统计数据
  updateDelayStats(delayData, stats);
  
  // 更新图表
  updateServiceDelayChart(service, delayData, chartRef);
};

// 更新延迟统计数据
const updateDelayStats = (delayData: Ref<DelayDataPoint[]>, stats: Ref<DelayStats>) => {
  if (delayData.value.length === 0) {
    stats.value = { avg: 0, min: 0, max: 0 };
    return;
  }
  
  const delays = delayData.value.map(item => item.delay);
  const sum = delays.reduce((acc, delay) => acc + delay, 0);
  
  stats.value = {
    avg: Math.round(sum / delays.length),
    min: Math.min(...delays),
    max: Math.max(...delays)
  };
};

// 更新单个服务的延迟图表
const updateServiceDelayChart = (service: string, delayData: Ref<DelayDataPoint[]>, chartRef: Ref<HTMLCanvasElement | null>) => {
  if (!chartRef.value) return;
  
  const canvas = chartRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 根据服务类型设置不同的颜色（Win10样式）
  let strokeColor: string;
  let fillColor: string;
  let gridColor = '#e0e0e0'; // Win10风格的网格线颜色
  let textColor = '#333333'; // Win10风格的文字颜色
  let bgColor = '#f8f9fa'; // Win10风格的背景颜色
  
  switch (service) {
    case 'netease':
      strokeColor = '#0078d7'; // Win10蓝色
      fillColor = 'rgba(0, 120, 215, 0.1)';
      break;
    case 'kugou':
      strokeColor = '#d83b01'; // Win10红色
      fillColor = 'rgba(216, 59, 1, 0.1)';
      break;
    case 'qq':
      strokeColor = '#107c10'; // Win10绿色
      fillColor = 'rgba(16, 124, 16, 0.1)';
      break;
    case 'extra':
      strokeColor = '#8e44ad'; // Win10紫色
      fillColor = 'rgba(142, 68, 173, 0.1)';
      break;
    default:
      strokeColor = '#0078d7';
      fillColor = 'rgba(0, 120, 215, 0.1)';
  }
  
  // 绘制Win10风格的背景
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 绘制Win10风格的网格线
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  
  // 水平网格线
  for (let i = 0; i <= 5; i++) {
    const y = 15 + (i / 5) * (canvas.height - 30);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  
  // 垂直网格线
  for (let i = 0; i <= 6; i++) {
    const x = (i / 6) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(x, 15);
    ctx.lineTo(x, canvas.height - 15);
    ctx.stroke();
  }
  
  if (delayData.value.length < 2) {
    // 绘制空状态（Win10风格）
    ctx.fillStyle = textColor;
    ctx.font = '14px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
    return;
  }
  
  // 计算数据范围
  const minY = Math.min(...delayData.value.map(item => item.delay)) * 0.9;
  const maxY = Math.max(...delayData.value.map(item => item.delay)) * 1.1;
  const rangeY = maxY - minY || 100;
  
  // 计算统计数据
  const delays = delayData.value.map(item => item.delay);
  const avgDelay = Math.round(delays.reduce((sum, delay) => sum + delay, 0) / delays.length);
  const minDelay = Math.min(...delays);
  const maxDelay = Math.max(...delays);
  
  // 绘制折线图（Win10风格）
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.lineWidth = 2.5; // 稍粗的线条，更符合Win10风格
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - ((delayData.value[0].delay - minY) / rangeY) * (canvas.height - 30) - 15);
  
  for (let i = 1; i < delayData.value.length; i++) {
    const x = (i / (delayData.value.length - 1)) * canvas.width;
    const y = canvas.height - ((delayData.value[i].delay - minY) / rangeY) * (canvas.height - 30) - 15;
    ctx.lineTo(x, y);
  }
  
  // 绘制填充区域
  ctx.lineTo(canvas.width, canvas.height - 15);
  ctx.lineTo(0, canvas.height - 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // 绘制数据点（Win10风格）
  ctx.fillStyle = strokeColor;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  
  for (let i = 0; i < delayData.value.length; i++) {
    const x = (i / (delayData.value.length - 1)) * canvas.width;
    const y = canvas.height - ((delayData.value[i].delay - minY) / rangeY) * (canvas.height - 30) - 15;
    
    // 绘制白色边框
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
    
    // 绘制彩色中心点
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
  }
  
  // 绘制坐标轴（Win10风格）
  ctx.strokeStyle = '#c0c0c0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - 15);
  ctx.lineTo(canvas.width, canvas.height - 15);
  ctx.moveTo(0, 15);
  ctx.lineTo(0, canvas.height - 15);
  ctx.stroke();
  
  // 绘制标签（Win10风格）
  ctx.fillStyle = textColor;
  ctx.font = '12px "Segoe UI", Arial';
  ctx.fillText('延迟 (ms)', 15, 12);
  ctx.textAlign = 'right';
  ctx.fillText('时间', canvas.width - 15, canvas.height - 5);
  ctx.textAlign = 'left';
  
  // 绘制详细统计信息（增强功能）
  ctx.fillStyle = textColor;
  ctx.font = '11px "Segoe UI", Arial';
  ctx.fillText(`平均: ${avgDelay}ms`, 15, canvas.height - 5);
  ctx.fillText(`最低: ${minDelay}ms`, 100, canvas.height - 5);
  ctx.fillText(`最高: ${maxDelay}ms`, 185, canvas.height - 5);
  
  // 绘制当前值（Win10风格）
  const currentDelay = delayData.value[delayData.value.length - 1].delay;
  ctx.fillStyle = strokeColor;
  ctx.font = '12px "Segoe UI", Arial';
  ctx.fillText(`当前: ${currentDelay}ms`, canvas.width - 100, 25);
  
  // 绘制单位标签
  ctx.fillStyle = textColor;
  ctx.font = '11px "Segoe UI", Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(maxY)}ms`, -5, 25);
  ctx.fillText(`${Math.round(minY)}ms`, -5, canvas.height - 20);
  ctx.textAlign = 'left';
  
  // 绘制数据点数量
  ctx.fillStyle = textColor;
  ctx.font = '10px "Segoe UI", Arial';
  ctx.fillText(`数据点: ${delayData.value.length}`, canvas.width - 80, canvas.height - 5);
};

// 组件挂载时初始化
onMounted(async () => {
  // 初始化API配置
  neteaseApi.value = settingStore.neteaseApi || '';
  kugouApi.value = settingStore.kugouApi || '';
  qqApi.value = settingStore.qqApi || '';
  extraApi.value = settingStore.extraApi || '';
  
  // 初始化优先搜索源
  prioritySearchSource.value = settingStore.prioritySearchSource || 'auto';
  
  // 初始化资源源设置
  resourceSources.value = settingStore.resourceSources || {
    download: 'auto',
    playback: 'auto',
    lyric: 'auto',
    cover: 'auto',
    playlist: 'auto',
    comment: 'auto',
    mv: 'auto'
  };
  
  // 初始化检测服务状态
  await performRealDelayCheck();
  
  // 应用API切换，确保内置服务状态正确
  await applyApiSwitching();
});

// 更新所有延迟图表
const updateAllDelayCharts = () => {
  updateServiceDelayChart('netease', neteaseDelayData, neteaseDelayChart);
  updateServiceDelayChart('kugou', kugouDelayData, kugouDelayChart);
  updateServiceDelayChart('qq', qqDelayData, qqDelayChart);
  updateServiceDelayChart('extra', extraDelayData, extraDelayChart);
};





// 打开API管理弹窗
const openApiManager = () => {
  const modalInstance = window.$modal.create({
    preset: "card",
    transformOrigin: "center",
    autoFocus: false,
    style: { width: "800px", maxWidth: "90vw" },
    title: "API配置与服务管理",
    content: () => {
      return h('div', {
        style: { padding: '16px' }
      }, [
        h('h4', { style: { marginBottom: '16px' } }, '服务状态'),
        h('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)',
            gap: '16px',
            marginBottom: '24px'
          }
        }, [
          h('div', {
            style: {
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa'
            }
          }, [
            h('div', { style: { fontWeight: 'bold', marginBottom: '8px' } }, '网易云音乐'),
            h('div', {
              style: {
                fontSize: '14px',
                color: builtinServices.value.netease.status ? '#107c10' : '#d83b01'
              }
            }, builtinServices.value.netease.status ? '官方可用' : '已被用户API替代'),
            builtinServices.value.netease.status && h('div', {
              style: { fontSize: '12px', color: '#666', marginTop: '4px' }
            }, `延迟: ${builtinServices.value.netease.delay}ms`)
          ]),
          h('div', {
            style: {
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa'
            }
          }, [
            h('div', { style: { fontWeight: 'bold', marginBottom: '8px' } }, '酷狗音乐'),
            h('div', {
              style: {
                fontSize: '14px',
                color: builtinServices.value.kugou.status ? '#107c10' : '#d83b01'
              }
            }, builtinServices.value.kugou.status ? '官方可用' : '已被用户API替代'),
            builtinServices.value.kugou.status && h('div', {
              style: { fontSize: '12px', color: '#666', marginTop: '4px' }
            }, `延迟: ${builtinServices.value.kugou.delay}ms`)
          ]),
          h('div', {
            style: {
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa'
            }
          }, [
            h('div', { style: { fontWeight: 'bold', marginBottom: '8px' } }, 'QQ音乐'),
            h('div', {
              style: {
                fontSize: '14px',
                color: builtinServices.value.qq.status ? '#107c10' : '#d83b01'
              }
            }, builtinServices.value.qq.status ? '官方可用' : '已被用户API替代'),
            builtinServices.value.qq.status && h('div', {
              style: { fontSize: '12px', color: '#666', marginTop: '4px' }
            }, `延迟: ${builtinServices.value.qq.delay}ms`)
          ]),
          h('div', {
            style: {
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa'
            }
          }, [
            h('div', { style: { fontWeight: 'bold', marginBottom: '8px' } }, '备用网易云API'),
            h('div', {
              style: {
                fontSize: '14px',
                color: userServices.value.extra.status ? '#107c10' : '#666'
              }
            }, userServices.value.extra.status ? '已启用' : '未设置'),
            userServices.value.extra.status && h('div', {
              style: { fontSize: '12px', color: '#666', marginTop: '4px' }
            }, `延迟: ${userServices.value.extra.delay}ms`)
          ])
        ]),
        h('h4', { style: { marginBottom: '16px' } }, 'API配置'),
        h('div', {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '24px'
          }
        }, [
          h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '8px' }
          }, [
            h('label', { style: { fontWeight: 'bold' } }, '网易云音乐API'),
            h('input', {
              type: 'text',
              value: neteaseApi.value,
              onInput: (e: any) => neteaseApi.value = e.target.value,
              placeholder: '请输入网易云音乐API地址',
              style: {
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }
            })
          ]),
          h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '8px' }
          }, [
            h('label', { style: { fontWeight: 'bold' } }, '酷狗音乐API'),
            h('input', {
              type: 'text',
              value: kugouApi.value,
              onInput: (e: any) => kugouApi.value = e.target.value,
              placeholder: '请输入酷狗音乐API地址',
              style: {
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }
            })
          ]),
          h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '8px' }
          }, [
            h('label', { style: { fontWeight: 'bold' } }, 'QQ音乐API'),
            h('input', {
              type: 'text',
              value: qqApi.value,
              onInput: (e: any) => qqApi.value = e.target.value,
              placeholder: '请输入QQ音乐API地址',
              style: {
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }
            })
          ]),
          h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '8px' }
          }, [
            h('label', { style: { fontWeight: 'bold' } }, '备用网易云API'),
            h('input', {
              type: 'text',
              value: extraApi.value,
              onInput: (e: any) => extraApi.value = e.target.value,
              placeholder: '请输入备用网易云API地址',
              style: {
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }
            })
          ])
        ]),
        h('h4', { style: { marginBottom: '16px' } }, '源设置'),
        h('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)',
            gap: '16px',
            marginBottom: '24px'
          }
        }, [
          h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '8px' }
          }, [
            h('label', { style: { fontWeight: 'bold' } }, '优先搜索源'),
            h('select', {
              value: prioritySearchSource.value,
              onInput: (e: any) => prioritySearchSource.value = e.target.value,
              style: {
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }
            }, [
              h('option', { value: 'official' }, '官方服务'),
              h('option', { value: 'user' }, '用户API'),
              h('option', { value: 'extra' }, '备用网易云API'),
              h('option', { value: 'auto' }, '自动选择')
            ])
          ]),
          h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '8px' }
          }, [
            h('label', { style: { fontWeight: 'bold' } }, '下载源'),
            h('select', {
              value: resourceSources.value.download,
              onInput: (e: any) => resourceSources.value.download = e.target.value,
              style: {
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }
            }, [
              h('option', { value: 'official' }, '官方服务'),
              h('option', { value: 'user' }, '用户API'),
              h('option', { value: 'extra' }, '备用网易云API'),
              h('option', { value: 'auto' }, '自动选择')
            ])
          ]),
          h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '8px' }
          }, [
            h('label', { style: { fontWeight: 'bold' } }, '播放源'),
            h('select', {
              value: resourceSources.value.playback,
              onInput: (e: any) => resourceSources.value.playback = e.target.value,
              style: {
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }
            }, [
              h('option', { value: 'official' }, '官方服务'),
              h('option', { value: 'user' }, '用户API'),
              h('option', { value: 'extra' }, '备用网易云API'),
              h('option', { value: 'auto' }, '自动选择')
            ])
          ]),
          h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '8px' }
          }, [
            h('label', { style: { fontWeight: 'bold' } }, '歌词源'),
            h('select', {
              value: resourceSources.value.lyric,
              onInput: (e: any) => resourceSources.value.lyric = e.target.value,
              style: {
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }
            }, [
              h('option', { value: 'official' }, '官方服务'),
              h('option', { value: 'user' }, '用户API'),
              h('option', { value: 'extra' }, '备用网易云API'),
              h('option', { value: 'auto' }, '自动选择')
            ])
          ]),
          h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '8px' }
          }, [
            h('label', { style: { fontWeight: 'bold' } }, '封面源'),
            h('select', {
              value: resourceSources.value.cover,
              onInput: (e: any) => resourceSources.value.cover = e.target.value,
              style: {
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }
            }, [
              h('option', { value: 'official' }, '官方服务'),
              h('option', { value: 'user' }, '用户API'),
              h('option', { value: 'extra' }, '备用网易云API'),
              h('option', { value: 'auto' }, '自动选择')
            ])
          ]),
          h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '8px' }
          }, [
            h('label', { style: { fontWeight: 'bold' } }, '歌单源'),
            h('select', {
              value: resourceSources.value.playlist,
              onInput: (e: any) => resourceSources.value.playlist = e.target.value,
              style: {
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }
            }, [
              h('option', { value: 'official' }, '官方服务'),
              h('option', { value: 'user' }, '用户API'),
              h('option', { value: 'extra' }, '备用网易云API'),
              h('option', { value: 'auto' }, '自动选择')
            ])
          ]),
          h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '8px' }
          }, [
            h('label', { style: { fontWeight: 'bold' } }, '评论源'),
            h('select', {
              value: resourceSources.value.comment,
              onInput: (e: any) => resourceSources.value.comment = e.target.value,
              style: {
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }
            }, [
              h('option', { value: 'official' }, '官方服务'),
              h('option', { value: 'user' }, '用户API'),
              h('option', { value: 'extra' }, '备用网易云API'),
              h('option', { value: 'auto' }, '自动选择')
            ])
          ]),
          h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: '8px' }
          }, [
            h('label', { style: { fontWeight: 'bold' } }, 'MV视频源'),
            h('select', {
              value: resourceSources.value.mv,
              onInput: (e: any) => resourceSources.value.mv = e.target.value,
              style: {
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }
            }, [
              h('option', { value: 'official' }, '官方服务'),
              h('option', { value: 'user' }, '用户API'),
              h('option', { value: 'extra' }, '备用网易云API'),
              h('option', { value: 'auto' }, '自动选择')
            ])
          ])
        ]),
        h('h4', { style: { marginBottom: '16px' } }, 'API延迟监控'),
        h('div', {
          style: {
            display: 'flex',
            gap: '12px',
            marginBottom: '16px'
          }
        }, [
          h('button', {
            onClick: checkRealTimeDelay,
            style: {
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #0078d7',
              backgroundColor: '#0078d7',
              color: '#ffffff',
              fontSize: '14px',
              cursor: 'pointer'
            }
          }, '实时检测'),
          h('button', {
            onClick: stopRealTimeDelay,
            style: {
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #d83b01',
              backgroundColor: '#ffffff',
              color: '#d83b01',
              fontSize: '14px',
              cursor: 'pointer'
            }
          }, '停止检测')
        ]),
        h('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr)',
            gap: '16px',
            marginBottom: '24px'
          }
        }, [
          h('div', {
            style: {
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa'
            }
          }, [
            h('div', { style: { fontWeight: 'bold', marginBottom: '12px' } }, '网易云音乐'),
            h('canvas', { 
              ref: neteaseDelayChart,
              width: 400, 
              height: 150,
              style: { width: '100%', height: '150px', borderRadius: '4px' }
            }),
            h('div', {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                fontSize: '12px',
                color: '#666'
              }
            }, [
              h('span', {}, `平均: ${neteaseStats.value.avg}ms`),
              h('span', {}, `最低: ${neteaseStats.value.min}ms`),
              h('span', {}, `最高: ${neteaseStats.value.max}ms`)
            ])
          ]),
          h('div', {
            style: {
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa'
            }
          }, [
            h('div', { style: { fontWeight: 'bold', marginBottom: '12px' } }, '酷狗音乐'),
            h('canvas', { 
              ref: kugouDelayChart,
              width: 400, 
              height: 150,
              style: { width: '100%', height: '150px', borderRadius: '4px' }
            }),
            h('div', {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                fontSize: '12px',
                color: '#666'
              }
            }, [
              h('span', {}, `平均: ${kugouStats.value.avg}ms`),
              h('span', {}, `最低: ${kugouStats.value.min}ms`),
              h('span', {}, `最高: ${kugouStats.value.max}ms`)
            ])
          ]),
          h('div', {
            style: {
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa'
            }
          }, [
            h('div', { style: { fontWeight: 'bold', marginBottom: '12px' } }, 'QQ音乐'),
            h('canvas', { 
              ref: qqDelayChart,
              width: 400, 
              height: 150,
              style: { width: '100%', height: '150px', borderRadius: '4px' }
            }),
            h('div', {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                fontSize: '12px',
                color: '#666'
              }
            }, [
              h('span', {}, `平均: ${qqStats.value.avg}ms`),
              h('span', {}, `最低: ${qqStats.value.min}ms`),
              h('span', {}, `最高: ${qqStats.value.max}ms`)
            ])
          ]),
          h('div', {
            style: {
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa'
            }
          }, [
            h('div', { style: { fontWeight: 'bold', marginBottom: '12px' } }, '备用网易云API'),
            h('canvas', { 
              ref: extraDelayChart,
              width: 400, 
              height: 150,
              style: { width: '100%', height: '150px', borderRadius: '4px' }
            }),
            h('div', {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                fontSize: '12px',
                color: '#666'
              }
            }, [
              h('span', {}, `平均: ${extraStats.value.avg}ms`),
              h('span', {}, `最低: ${extraStats.value.min}ms`),
              h('span', {}, `最高: ${extraStats.value.max}ms`)
            ])
          ])
        ]),
        h('div', {
          style: {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '24px'
          }
        }, [
          h('button', {
            type: 'button',
            onClick: async () => {
              await saveApiConfig();
              modalInstance.destroy();
            },
            style: {
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa',
              cursor: 'pointer',
              fontSize: '14px'
            }
          }, '保存配置'),
          h('button', {
            type: 'button',
            onClick: () => modalInstance.destroy(),
            style: {
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa',
              cursor: 'pointer',
              fontSize: '14px'
            }
          }, '取消')
        ])
      ]);
    }
  });
};

// 组件卸载时清理
onUnmounted(() => {
  if (realTimeCheckTimer.value) {
    clearInterval(realTimeCheckTimer.value);
    realTimeCheckTimer.value = null;
  }
});
</script>

<style lang="scss" scoped>
.set-list {
  margin-bottom: 20px;
  &:last-child {
    margin-bottom: 0;
  }
}

.set-item {
  margin-bottom: 12px;
  &:last-child {
    margin-bottom: 0;
  }
}

.n-form-item {
  margin-bottom: 16px;
  width: 100%;
  
  :deep(.n-form-item-label) {
    width: 100px;
    flex-shrink: 0;
  }
  
  :deep(.n-form-item-control) {
    flex: 1;
  }
}

.api-configs {
  width: 100%;
  
  @media (max-width: 768px) {
    .n-form-item {
      :deep(.n-form-item-label) {
        width: 80px;
      }
    }
  }
}

@media (max-width: 768px) {
  .n-h3 {
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  
  .n-button {
    font-size: 12px;
    padding: 4px 8px;
  }
}
</style>