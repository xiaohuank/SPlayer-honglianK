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
      <n-card class="set-item">
        <n-text depth="3">红联K是一个额外功能，目前正在开发中...</n-text>
      </n-card>
    </div>
    <div class="set-list">
      <n-h3 prefix="bar"> API配置与服务管理 </n-h3>
      <n-card class="set-item">
        <!-- 自带服务 -->
        <n-collapse>
          <n-collapse-item title="自带服务" name="built-in">
            <n-alert
              title="自带服务状态"
              type="info"
              :bordered="false"
              :closable="false"
              style="margin-bottom: 16px"
            >
              <n-grid :cols="3" :x-gap="12">
                <n-grid-item>
                  <n-text>
                    网易云音乐: {{ builtinServices.netease.status ? '可用' : '不可用' }}
                    <n-tag v-if="builtinServices.netease.status" size="small" type="success" style="margin-left: 8px">
                      官方 {{ builtinServices.netease.delay }}ms
                    </n-tag>
                    <n-tag v-else-if="userServices.netease.status" size="small" type="warning" style="margin-left: 8px">
                      已被用户API替代
                    </n-tag>
                  </n-text>
                </n-grid-item>
                <n-grid-item>
                  <n-text>
                    酷狗音乐: {{ builtinServices.kugou.status ? '可用' : '不可用' }}
                    <n-tag v-if="builtinServices.kugou.status" size="small" type="success" style="margin-left: 8px">
                      官方 {{ builtinServices.kugou.delay }}ms
                    </n-tag>
                    <n-tag v-else-if="userServices.kugou.status" size="small" type="warning" style="margin-left: 8px">
                      已被用户API替代
                    </n-tag>
                  </n-text>
                </n-grid-item>
                <n-grid-item>
                  <n-text>
                    QQ音乐: {{ builtinServices.qq.status ? '可用' : '不可用' }}
                    <n-tag v-if="builtinServices.qq.status" size="small" type="success" style="margin-left: 8px">
                      官方 {{ builtinServices.qq.delay }}ms
                    </n-tag>
                    <n-tag v-else-if="userServices.qq.status" size="small" type="warning" style="margin-left: 8px">
                      已被用户API替代
                    </n-tag>
                  </n-text>
                </n-grid-item>
              </n-grid>
            </n-alert>
            <n-text depth="3" style="margin-bottom: 16px">
              当用户添加API并检测可用后，系统将自动启用自定义API并关闭对应的自带服务。
            </n-text>
          </n-collapse-item>
          
          <!-- 用户添加服务 -->
          <n-collapse-item title="用户添加服务" name="user-added">
            <n-alert
              title="用户服务状态"
              type="info"
              :bordered="false"
              :closable="false"
              style="margin-bottom: 16px"
            >
              <n-grid :cols="3" :x-gap="12">
                <n-grid-item>
                  <n-text>
                    自定义网易云: {{ userServices.netease.status ? '可用' : '不可用' }}
                    <n-tag v-if="userServices.netease.status" size="small" type="success" style="margin-left: 8px">
                      用户 {{ userServices.netease.delay }}ms
                    </n-tag>
                  </n-text>
                </n-grid-item>
                <n-grid-item>
                  <n-text>
                    自定义酷狗: {{ userServices.kugou.status ? '可用' : '不可用' }}
                    <n-tag v-if="userServices.kugou.status" size="small" type="success" style="margin-left: 8px">
                      用户 {{ userServices.kugou.delay }}ms
                    </n-tag>
                  </n-text>
                </n-grid-item>
                <n-grid-item>
                  <n-text>
                    自定义QQ: {{ userServices.qq.status ? '可用' : '不可用' }}
                    <n-tag v-if="userServices.qq.status" size="small" type="success" style="margin-left: 8px">
                      用户 {{ userServices.qq.delay }}ms
                    </n-tag>
                  </n-text>
                </n-grid-item>
              </n-grid>
            </n-alert>
            <div class="api-configs">
              <n-alert
                title="API填写规则"
                type="info"
                :bordered="false"
                :closable="false"
                style="margin-bottom: 16px"
              >
                <ul style="margin: 0; padding-left: 20px">
                  <li>请输入完整的API地址，例如：https://api.example.com</li>
                  <li>支持HTTP和HTTPS协议</li>
                  <li>系统会自动检测API的可用性和延迟</li>
                  <li>API不可用时，系统会自动回退到官方服务</li>
                </ul>
              </n-alert>
              
              <n-form-item label="网易云音乐API">
                <n-flex vertical>
                  <n-input
                    v-model:value="neteaseApi"
                    placeholder="请输入网易云音乐API地址"
                    clearable
                    style="width: 100%"
                  />
                  <n-flex justify="flex-end" style="margin-top: 8px">
                    <n-tag v-if="userServices.netease.status" size="small" type="success">
                      已自动启用
                    </n-tag>
                    <n-tag v-else-if="neteaseApi" size="small" type="info">
                      待检测
                    </n-tag>
                    <n-tag v-else size="small" type="default">
                      未设置
                    </n-tag>
                  </n-flex>
                </n-flex>
              </n-form-item>
              
              <n-form-item label="酷狗音乐API">
                <n-flex vertical>
                  <n-input
                    v-model:value="kugouApi"
                    placeholder="请输入酷狗音乐API地址"
                    clearable
                    style="width: 100%"
                  />
                  <n-flex justify="flex-end" style="margin-top: 8px">
                    <n-tag v-if="userServices.kugou.status" size="small" type="success">
                      已自动启用
                    </n-tag>
                    <n-tag v-else-if="kugouApi" size="small" type="info">
                      待检测
                    </n-tag>
                    <n-tag v-else size="small" type="default">
                      未设置
                    </n-tag>
                  </n-flex>
                </n-flex>
              </n-form-item>
              
              <n-form-item label="QQ音乐API">
                <n-flex vertical>
                  <n-input
                    v-model:value="qqApi"
                    placeholder="请输入QQ音乐API地址"
                    clearable
                    style="width: 100%"
                  />
                  <n-flex justify="flex-end" style="margin-top: 8px">
                    <n-tag v-if="userServices.qq.status" size="small" type="success">
                      已自动启用
                    </n-tag>
                    <n-tag v-else-if="qqApi" size="small" type="info">
                      待检测
                    </n-tag>
                    <n-tag v-else size="small" type="default">
                      未设置
                    </n-tag>
                  </n-flex>
                </n-flex>
              </n-form-item>
            </div>
            
            <n-form-item label="优先搜索源">
              <n-select
                v-model:value="prioritySearchSource"
                :options="[
                  { label: '官方服务', value: 'official' },
                  { label: '用户API', value: 'user' },
                  { label: '自动选择', value: 'auto' }
                ]"
                placeholder="请选择优先搜索源"
                style="width: 100%"
              />
              <n-text depth="3" style="margin-top: 8px; font-size: 12px; color: var(--text-3)">
                自动选择：系统会根据延迟和可用性自动选择最优的搜索源
              </n-text>
            </n-form-item>
            
            <n-flex justify="flex-end" align="center" style="margin-top: 16px; gap: 12px">
              <n-button
                type="primary"
                strong
                @click="saveApiConfig"
              >
                保存配置
              </n-button>
            </n-flex>
          </n-collapse-item>
          
          <!-- 延迟监控 -->
          <n-collapse-item title="延迟监控" name="delay-monitor" @expand="handleDelayMonitorExpand">
            <n-space vertical style="width: 100%">
              <n-flex justify="flex-end" align="center" style="margin-bottom: 16px; gap: 12px">
                <n-button
                  type="primary"
                  secondary
                  strong
                  @click="checkRealTimeDelay"
                  :disabled="!!realTimeCheckTimer"
                >
                  开始实时检测
                </n-button>
                <n-button
                  type="primary"
                  secondary
                  strong
                  @click="stopRealTimeDelay"
                  :disabled="!realTimeCheckTimer"
                >
                  停止实时检测
                </n-button>
              </n-flex>
              
              <!-- 网易云音乐延迟监控 -->
              <n-card>
                <n-h4>
                  网易云音乐延迟
                  <n-tag v-if="neteaseApi && userServices.netease.status" size="small" type="info" style="margin-left: 8px">
                    用户数据
                  </n-tag>
                  <n-tag v-else size="small" type="success" style="margin-left: 8px">
                    官方数据
                  </n-tag>
                </n-h4>
                <div style="height: 150px; margin-top: 12px">
                  <canvas ref="neteaseDelayChart" width="100%" height="150"></canvas>
                </div>
                <n-grid :cols="3" :x-gap="8" style="margin-top: 12px">
                  <n-grid-item>
                    <n-card>
                      <n-text strong style="font-size: 12px">平均</n-text>
                      <n-text>{{ neteaseStats.avg }}ms</n-text>
                    </n-card>
                  </n-grid-item>
                  <n-grid-item>
                    <n-card>
                      <n-text strong style="font-size: 12px">最低</n-text>
                      <n-text>{{ neteaseStats.min }}ms</n-text>
                    </n-card>
                  </n-grid-item>
                  <n-grid-item>
                    <n-card>
                      <n-text strong style="font-size: 12px">最高</n-text>
                      <n-text>{{ neteaseStats.max }}ms</n-text>
                    </n-card>
                  </n-grid-item>
                </n-grid>
              </n-card>
              
              <!-- 酷狗音乐延迟监控 -->
              <n-card>
                <n-h4>
                  酷狗音乐延迟
                  <n-tag v-if="kugouApi && userServices.kugou.status" size="small" type="info" style="margin-left: 8px">
                    用户数据
                  </n-tag>
                  <n-tag v-else size="small" type="success" style="margin-left: 8px">
                    官方数据
                  </n-tag>
                </n-h4>
                <div style="height: 150px; margin-top: 12px">
                  <canvas ref="kugouDelayChart" width="100%" height="150"></canvas>
                </div>
                <n-grid :cols="3" :x-gap="8" style="margin-top: 12px">
                  <n-grid-item>
                    <n-card>
                      <n-text strong style="font-size: 12px">平均</n-text>
                      <n-text>{{ kugouStats.avg }}ms</n-text>
                    </n-card>
                  </n-grid-item>
                  <n-grid-item>
                    <n-card>
                      <n-text strong style="font-size: 12px">最低</n-text>
                      <n-text>{{ kugouStats.min }}ms</n-text>
                    </n-card>
                  </n-grid-item>
                  <n-grid-item>
                    <n-card>
                      <n-text strong style="font-size: 12px">最高</n-text>
                      <n-text>{{ kugouStats.max }}ms</n-text>
                    </n-card>
                  </n-grid-item>
                </n-grid>
              </n-card>
              
              <!-- QQ音乐延迟监控 -->
              <n-card>
                <n-h4>
                  QQ音乐延迟
                  <n-tag v-if="qqApi && userServices.qq.status" size="small" type="info" style="margin-left: 8px">
                    用户数据
                  </n-tag>
                  <n-tag v-else size="small" type="success" style="margin-left: 8px">
                    官方数据
                  </n-tag>
                </n-h4>
                <div style="height: 150px; margin-top: 12px">
                  <canvas ref="qqDelayChart" width="100%" height="150"></canvas>
                </div>
                <n-grid :cols="3" :x-gap="8" style="margin-top: 12px">
                  <n-grid-item>
                    <n-card>
                      <n-text strong style="font-size: 12px">平均</n-text>
                      <n-text>{{ qqStats.avg }}ms</n-text>
                    </n-card>
                  </n-grid-item>
                  <n-grid-item>
                    <n-card>
                      <n-text strong style="font-size: 12px">最低</n-text>
                      <n-text>{{ qqStats.min }}ms</n-text>
                    </n-card>
                  </n-grid-item>
                  <n-grid-item>
                    <n-card>
                      <n-text strong style="font-size: 12px">最高</n-text>
                      <n-text>{{ qqStats.max }}ms</n-text>
                    </n-card>
                  </n-grid-item>
                </n-grid>
              </n-card>
              
              <n-text depth="3" style="margin-top: 8px; font-size: 12px; color: var(--text-3)">
                注：实时延迟数据基于最近30秒的网络请求响应时间
              </n-text>
            </n-space>
          </n-collapse-item>
        </n-collapse>
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
// 优先搜索源
const prioritySearchSource = ref('auto');

// 服务状态和延迟
interface ServiceStatus {
  status: boolean;
  delay: number;
}

interface Services {
  netease: ServiceStatus;
  kugou: ServiceStatus;
  qq: ServiceStatus;
}

// 自带服务
const builtinServices = ref<Services>({
  netease: { status: true, delay: 0 },
  kugou: { status: true, delay: 0 },
  qq: { status: true, delay: 0 }
});

// 用户添加服务
const userServices = ref<Services>({
  netease: { status: false, delay: 0 },
  kugou: { status: false, delay: 0 },
  qq: { status: false, delay: 0 }
});

// 延迟监控数据
interface DelayDataPoint {
  time: number;
  delay: number;
}

const neteaseDelayData = ref<DelayDataPoint[]>([]);
const kugouDelayData = ref<DelayDataPoint[]>([]);
const qqDelayData = ref<DelayDataPoint[]>([]);
const maxDelayDataPoints = 30; // 最多保存30个数据点（30秒）

// 图表引用
const neteaseDelayChart = ref<HTMLCanvasElement | null>(null);
const kugouDelayChart = ref<HTMLCanvasElement | null>(null);
const qqDelayChart = ref<HTMLCanvasElement | null>(null);

// 延迟统计数据
interface DelayStats {
  avg: number;
  min: number;
  max: number;
}

const neteaseStats = ref<DelayStats>({ avg: 0, min: 0, max: 0 });
const kugouStats = ref<DelayStats>({ avg: 0, min: 0, max: 0 });
const qqStats = ref<DelayStats>({ avg: 0, min: 0, max: 0 });

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
    // 检测自带服务延迟
    await checkServiceDelay('netease', builtinServices.value.netease, 'https://music.163.com');
    await checkServiceDelay('kugou', builtinServices.value.kugou, 'https://www.kugou.com');
    await checkServiceDelay('qq', builtinServices.value.qq, 'https://y.qq.com');
    
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
    
    // 更新延迟数据和图表
    updateDelayData();
  } catch (error) {
    console.error('延迟检测失败:', error);
    // 即使出错，也更新延迟数据，确保显示最新状态
    updateDelayData();
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
  
  // 应用API切换
  await applyApiSwitching();
  
  window.$message.success("API配置保存成功");
};

// 应用API切换
const applyApiSwitching = async () => {
  if (apiSwitching) return;
  
  apiSwitching = true;
  
  try {
    // 网易云音乐API切换
    if (neteaseApi.value && userServices.value.netease.status) {
      builtinServices.value.netease.status = false;
    } else if (!neteaseApi.value) {
      builtinServices.value.netease.status = true;
    }
    
    // 酷狗音乐API切换
    if (kugouApi.value && userServices.value.kugou.status) {
      builtinServices.value.kugou.status = false;
    } else if (!kugouApi.value) {
      builtinServices.value.kugou.status = true;
    }
    
    // QQ音乐API切换
    if (qqApi.value && userServices.value.qq.status) {
      builtinServices.value.qq.status = false;
    } else if (!qqApi.value) {
      builtinServices.value.qq.status = true;
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
    default:
      return;
  }
  
  // 添加新数据点
  if (delay > 0) {
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
  }
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
  
  // 绘制当前值（Win10风格）
  const currentDelay = delayData.value[delayData.value.length - 1].delay;
  ctx.fillStyle = strokeColor;
  ctx.font = '12px "Segoe UI", Arial';
  ctx.fillText(`${currentDelay}ms`, canvas.width - 70, 25);
  
  // 绘制单位标签
  ctx.fillStyle = textColor;
  ctx.font = '11px "Segoe UI", Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(maxY)}ms`, -5, 25);
  ctx.fillText(`${Math.round(minY)}ms`, -5, canvas.height - 20);
  ctx.textAlign = 'left';
};

// 组件挂载时初始化
onMounted(() => {
  // 初始化API配置
  neteaseApi.value = settingStore.neteaseApi || '';
  kugouApi.value = settingStore.kugouApi || '';
  qqApi.value = settingStore.qqApi || '';
  
  // 初始化检测服务状态
  performRealDelayCheck();
});

// 处理延迟监控面板展开
const handleDelayMonitorExpand = () => {
  // 立即执行一次延迟检测，确保展开时能看到最新数据
  performRealDelayCheck();
  
  // 延迟一点时间，确保DOM已经更新，然后重新渲染图表
  setTimeout(() => {
    updateAllDelayCharts();
  }, 100);
};

// 更新所有延迟图表
const updateAllDelayCharts = () => {
  updateServiceDelayChart('netease', neteaseDelayData, neteaseDelayChart);
  updateServiceDelayChart('kugou', kugouDelayData, kugouDelayChart);
  updateServiceDelayChart('qq', qqDelayData, qqDelayChart);
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