<template>
  <div class="network-tester">
    <div class="network-tester-header">
      <h4>网络连接检测</h4>
      <n-button
        type="primary"
        @click="startTest"
        :loading="loading"
        :disabled="loading"
      >
        开始检测
      </n-button>
    </div>
    <div class="network-tester-content">
      <div v-if="!testResults.length" class="network-tester-empty">
        <p>点击上方按钮开始检测网络连接状态</p>
      </div>
      <div v-else class="network-tester-results">
        <div
          v-for="result in testResults"
          :key="result.name"
          class="network-test-item"
          :class="{ passed: result.passed, failed: !result.passed }"
        >
          <div class="network-test-item-header">
            <div class="network-test-item-name">{{ result.name }}</div>
            <div class="network-test-item-status">
              <span v-if="result.passed" class="status-passed">✓ 成功</span>
              <span v-else class="status-failed">✗ 失败</span>
            </div>
          </div>
          <div class="network-test-item-details">
            <div v-if="result.responseTime" class="response-time">
              响应时间: {{ result.responseTime }}ms
            </div>
            <div v-if="result.error" class="error-message">
              错误: {{ result.error }}
            </div>
          </div>
        </div>
      </div>
      <div v-if="testResults.length" class="network-tester-summary">
        <div class="summary-item">
          <span class="summary-label">总检测项:</span>
          <span class="summary-value">{{ testResults.length }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">成功:</span>
          <span class="summary-value passed">{{ testResults.filter(r => r.passed).length }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">失败:</span>
          <span class="summary-value failed">{{ testResults.filter(r => !r.passed).length }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const loading = ref(false);
const testResults = ref<any[]>([]);

interface TestResult {
  name: string;
  passed: boolean;
  responseTime?: number;
  error?: string;
}

// 测试网络连接
const testNetwork = async (url: string, name: string): Promise<TestResult> => {
  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    return {
      name,
      passed: response.ok,
      responseTime,
    };
  } catch (error: any) {
    return {
      name,
      passed: false,
      error: error.message || "未知错误",
    };
  }
};

// 开始网络检测
const startTest = async () => {
  loading.value = true;
  testResults.value = [];

  try {
    // 测试项目列表
    const testItems = [
      { url: "https://www.baidu.com", name: "百度连接" },
      { url: "https://music.163.com", name: "网易云音乐" },
      { url: "https://api.netease.cloudmusic.com", name: "网易云音乐 API" },
      { url: "https://qq.com", name: "腾讯连接" },
      { url: "https://www.google.com", name: "Google 连接" },
    ];

    // 并行测试所有项目
    const results = await Promise.all(
      testItems.map(item => testNetwork(item.url, item.name))
    );

    testResults.value = results;
  } catch (error) {
    console.error("网络检测失败:", error);
    testResults.value = [
      {
        name: "网络检测",
        passed: false,
        error: "检测过程中发生错误",
      },
    ];
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.network-tester {
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 8px;

  .network-tester-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }
  }

  .network-tester-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 150px;
    color: #999;

    p {
      margin: 0;
    }
  }

  .network-tester-results {
    margin-bottom: 16px;
  }

  .network-test-item {
    padding: 12px;
    margin-bottom: 8px;
    background-color: #fff;
    border-radius: 6px;
    border-left: 3px solid #d9d9d9;

    &.passed {
      border-left-color: #52c41a;
    }

    &.failed {
      border-left-color: #ff4d4f;
    }

    .network-test-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .network-test-item-name {
        font-size: 14px;
        font-weight: 500;
      }

      .network-test-item-status {
        font-size: 12px;

        .status-passed {
          color: #52c41a;
        }

        .status-failed {
          color: #ff4d4f;
        }
      }
    }

    .network-test-item-details {
      font-size: 12px;
      color: #666;

      .response-time {
        margin-bottom: 4px;
      }

      .error-message {
        color: #ff4d4f;
      }
    }
  }

  .network-tester-summary {
    display: flex;
    justify-content: space-around;
    padding: 12px;
    background-color: #fff;
    border-radius: 6px;
    border-top: 1px solid #e8e8e8;

    .summary-item {
      display: flex;
      flex-direction: column;
      align-items: center;

      .summary-label {
        font-size: 12px;
        color: #999;
        margin-bottom: 4px;
      }

      .summary-value {
        font-size: 16px;
        font-weight: 600;
        color: #333;

        &.passed {
          color: #52c41a;
        }

        &.failed {
          color: #ff4d4f;
        }
      }
    }
  }
}
</style>