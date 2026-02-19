<template>
  <div class="user-list">
    <div class="list-header">
      <n-button quaternary @click="onBack">
        <template #icon>
          <SvgIcon name="ArrowLeft" />
        </template>
        返回
      </n-button>
      <n-text class="list-title">{{ title }}</n-text>
      <div class="header-placeholder"></div>
    </div>
    <div class="list-content">
      <div v-if="loading" class="loading-state">
        <n-skeleton width="100%" height="60px" :repeat="5" />
      </div>
      <div v-else>
        <div
          v-for="user in users"
          :key="user.uid"
          class="user-item"
          @click="openUserProfile(user.uid)"
        >
          <div class="user-avatar">
            <n-avatar 
              :src="user.avatarUrl" 
              fallback-src="/images/avatar.jpg" 
              round 
            />
          </div>
          <div class="user-info">
            <n-flex align="center">
              <n-text class="user-name">{{ user.nickname }}</n-text>
              <img v-if="user.vipType !== 0" class="vip-badge" src="/images/vip.png" />
            </n-flex>
            <n-text v-if="user.signature" size="small" class="user-signature text-hidden">
              {{ user.signature }}
            </n-text>
          </div>
          <div class="user-actions">
            <n-button 
              :type="user.isFollowing ? 'default' : 'primary'"
              size="small"
              round
              @click.stop="toggleFollow(user)"
            >
              {{ user.isFollowing ? '已关注' : '关注' }}
            </n-button>
          </div>
        </div>
        <div v-if="users.length === 0" class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="n-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <n-text>{{ emptyText }}</n-text>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getUserFollows, getUserFans, followUser } from '@/api/user';
import SvgIcon from '@/components/Global/SvgIcon.vue';

const props = defineProps<{
  type: 'follows' | 'fans';
  userId: number;
}>();

const emit = defineEmits<{
  'back': [];
  'open-user': [userId: number];
}>();

// 状态
const users = ref<any[]>([]);
const loading = ref(false);
const page = ref(0);
const limit = ref(50);

// 计算属性
const title = computed(() => {
  return props.type === 'follows' ? '关注列表' : '粉丝列表';
});

const emptyText = computed(() => {
  return props.type === 'follows' ? '暂无关注' : '暂无粉丝';
});

// 加载用户列表
const loadUsers = async (isRefresh = false) => {
  try {
    loading.value = true;
    const currentPage = isRefresh ? 0 : page.value;
    const result = props.type === 'follows'
      ? await getUserFollows(props.userId, limit.value, currentPage * limit.value)
      : await getUserFans(props.userId, limit.value, currentPage * limit.value);
    
    if (result && result.data) {
      if (isRefresh) {
        users.value = result.data;
        page.value = 1;
      } else {
        users.value = [...users.value, ...result.data];
        page.value++;
      }
    }
  } catch (error) {
    console.error('加载用户列表失败:', error);
    window.$message.error('加载用户列表失败');
  } finally {
    loading.value = false;
  }
};

// 关注/取消关注
const toggleFollow = async (user: any) => {
  try {
    await followUser(user.uid, user.isFollowing ? 0 : 1);
    user.isFollowing = !user.isFollowing;
    window.$message.success(user.isFollowing ? '关注成功' : '取消关注成功');
  } catch (error) {
    console.error('操作失败:', error);
    window.$message.error('操作失败，请重试');
  }
};

// 打开用户个人页面
const openUserProfile = (userId: number) => {
  emit('open-user', userId);
};

// 返回
const onBack = () => {
  emit('back');
};

// 组件挂载时加载数据
onMounted(() => {
  loadUsers(true);
});
</script>

<style lang="scss" scoped>
.user-list {
  min-height: 100vh;
  background-color: var(--surface-container-hex);

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    background-color: var(--surface-container-hex);
    z-index: 10;

    .list-title {
      font-size: 18px;
      font-weight: bold;
    }

    .header-placeholder {
      width: 80px;
    }
  }

  .list-content {
    padding: 16px 24px;

    .loading-state {
      margin-bottom: 20px;
    }

    .user-item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background-color 0.3s;

      &:hover {
        background-color: rgba(var(--primary), 0.05);
      }

      .user-avatar {
        margin-right: 16px;
      }

      .user-info {
        flex: 1;
        min-width: 0;

        .user-name {
          font-size: 14px;
          font-weight: 500;
          margin-right: 8px;
        }

        .vip-badge {
          height: 16px;
        }

        .user-signature {
          color: var(--text-secondary);
          margin-top: 4px;
          max-width: 400px;
        }
      }

      .user-actions {
        margin-left: 16px;

        button {
          min-width: 80px;
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      color: var(--text-secondary);

      svg {
        margin-bottom: 16px;
        opacity: 0.5;
      }
    }
  }
}

@media (max-width: 768px) {
  .user-list {
    .list-header {
      padding: 12px 16px;

      .list-title {
        font-size: 16px;
      }
    }

    .list-content {
      padding: 12px 16px;

      .user-item {
        .user-info {
          .user-signature {
            max-width: 200px;
          }
        }
      }
    }
  }
}
</style>