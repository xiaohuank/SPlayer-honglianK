<template>
  <div class="user-profile">
    <!-- 用户头部信息 -->
    <div class="user-header">
      <div class="header-bg">
        <s-image 
          :src="userData.backgroundUrl || '/images/default-bg.jpg'" 
          class="bg-image"
        />
        <div class="bg-overlay"></div>
      </div>
      <div class="user-info">
        <div class="avatar-section">
          <n-avatar 
            :src="userData.avatarUrl" 
            fallback-src="/images/avatar.jpg" 
            round 
            class="avatar"
          />
        </div>
        <div class="user-details">
          <n-flex align="center">
            <n-text class="nickname">{{ userData.nickname || '未知用户' }}</n-text>
            <img v-if="userData.vipType !== 0" class="vip-badge" src="/images/vip.png" />
          </n-flex>
          <n-flex size="small" class="user-meta">
            <n-tag :bordered="false" size="small" round type="warning">
              Lv.{{ userData.level || 0 }}
            </n-tag>
            <n-text v-if="userData.signature" class="signature text-hidden">
              {{ userData.signature }}
            </n-text>
          </n-flex>
          <n-flex class="user-stats">
            <div class="stat-item" @click="showFollows">
              <n-text class="stat-value">{{ userData.follows || 0 }}</n-text>
              <n-text class="stat-label">关注</n-text>
            </div>
            <div class="stat-item" @click="showFans">
              <n-text class="stat-value">{{ userData.fans || 0 }}</n-text>
              <n-text class="stat-label">粉丝</n-text>
            </div>
            <div class="stat-item" @click="switchTab('playlists')">
              <n-text class="stat-value">{{ userData.playlistCount || 0 }}</n-text>
              <n-text class="stat-label">歌单</n-text>
            </div>
          </n-flex>
          <n-flex class="action-buttons">
            <n-button 
              v-if="!isCurrentUser" 
              :type="isFollowing ? 'default' : 'primary'"
              round
              @click="toggleFollow"
            >
              {{ isFollowing ? '已关注' : '关注' }}
            </n-button>
            <n-button 
              v-else
              type="primary"
              round
            >
              编辑资料
            </n-button>
            <n-button 
              v-if="!isCurrentUser"
              quaternary
              round
              @click="sendPrivateMessage"
            >
              私信
            </n-button>
          </n-flex>
        </div>
      </div>
    </div>

    <!-- 用户内容区域 -->
    <div class="user-content">
      <div class="content-tabs">
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'playlists' }"
          @click="switchTab('playlists')"
        >
          歌单
        </div>
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'albums' }"
          @click="switchTab('albums')"
        >
          专辑
        </div>
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'artists' }"
          @click="switchTab('artists')"
        >
          歌手
        </div>
      </div>

      <!-- 歌单列表 -->
      <div v-if="activeTab === 'playlists'" class="playlist-list">
        <n-grid cols="3" responsive="self">
          <n-grid-item v-for="playlist in playlists" :key="playlist.id" class="playlist-item">
            <div class="playlist-card" @click="openPlaylist(playlist.id)">
              <s-image :src="playlist.coverImgUrl" class="playlist-cover" />
              <n-ellipsis :line-clamp="2" class="playlist-name">
                {{ playlist.name }}
              </n-ellipsis>
              <n-text size="small" class="playlist-count">
                {{ playlist.trackCount }}首
              </n-text>
            </div>
          </n-grid-item>
        </n-grid>
        <div v-if="playlists.length === 0" class="empty-content">
          <n-text>暂无歌单</n-text>
        </div>
      </div>

      <!-- 专辑列表 -->
      <div v-else-if="activeTab === 'albums'" class="album-list">
        <n-grid cols="3" responsive="self">
          <n-grid-item v-for="album in albums" :key="album.id" class="album-item">
            <div class="album-card" @click="openAlbum(album.id)">
              <s-image :src="album.picUrl" class="album-cover" />
              <n-ellipsis :line-clamp="1" class="album-name">
                {{ album.name }}
              </n-ellipsis>
              <n-text size="small" class="album-artist">
                {{ album.artist.name }}
              </n-text>
            </div>
          </n-grid-item>
        </n-grid>
        <div v-if="albums.length === 0" class="empty-content">
          <n-text>暂无专辑</n-text>
        </div>
      </div>

      <!-- 歌手列表 -->
      <div v-else-if="activeTab === 'artists'" class="artist-list">
        <n-grid cols="3" responsive="self">
          <n-grid-item v-for="artist in artists" :key="artist.id" class="artist-item">
            <div class="artist-card" @click="openArtist(artist.id)">
              <s-image :src="artist.img1v1Url" class="artist-cover" />
              <n-ellipsis :line-clamp="1" class="artist-name">
                {{ artist.name }}
              </n-ellipsis>
            </div>
          </n-grid-item>
        </n-grid>
        <div v-if="artists.length === 0" class="empty-content">
          <n-text>暂无歌手</n-text>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getUserDetailWithCounts, followUser } from '@/api/user';
import sImage from '@/components/UI/s-image.vue';

const props = defineProps<{
  userId: number;
  isCurrentUser?: boolean;
}>();

const emit = defineEmits<{
  'open-playlist': [id: number];
  'open-album': [id: number];
  'open-artist': [id: number];
  'open-message': [userId: number, nickname: string, avatarUrl: string];
  'show-follows': [userId: number];
  'show-fans': [userId: number];
}>();

// 状态
const userData = ref<any>({
  nickname: '',
  avatarUrl: '',
  backgroundUrl: '',
  level: 0,
  vipType: 0,
  signature: '',
  follows: 0,
  fans: 0,
  playlistCount: 0,
});

const playlists = ref<any[]>([]);
const albums = ref<any[]>([]);
const artists = ref<any[]>([]);
const activeTab = ref<'playlists' | 'albums' | 'artists'>('playlists');
const isFollowing = ref(false);
const loading = ref(false);

// 加载用户数据
const loadUserData = async () => {
  try {
    loading.value = true;
    const result = await getUserDetailWithCounts(props.userId);
    if (result && result.data) {
      const data = result.data;
      userData.value = {
        nickname: data.nickname,
        avatarUrl: data.avatarUrl,
        backgroundUrl: data.backgroundUrl,
        level: data.level,
        vipType: data.vipType,
        signature: data.signature,
        follows: data.follows,
        fans: data.fans,
        playlistCount: data.playlistCount,
      };
      isFollowing.value = data.isFollowing || false;
    }
  } catch (error) {
    console.error('加载用户数据失败:', error);
    window.$message.error('加载用户数据失败');
  } finally {
    loading.value = false;
  }
};

// 加载用户歌单
const loadUserPlaylists = async () => {
  try {
    // 暂时注释掉，因为userPlaylist导入失败
    // const result = await userPlaylist(50, 0, props.userId);
    // if (result && result.data) {
    //   playlists.value = result.data.filter((item: any) => !item.subscribed);
    // }
  } catch (error) {
    console.error('加载用户歌单失败:', error);
  }
};

// 切换标签
const switchTab = (tab: 'playlists' | 'albums' | 'artists') => {
  activeTab.value = tab;
  if (tab === 'playlists' && playlists.value.length === 0) {
    loadUserPlaylists();
  }
};

// 关注/取消关注
const toggleFollow = async () => {
  try {
    await followUser(props.userId, isFollowing.value ? 0 : 1);
    isFollowing.value = !isFollowing.value;
    userData.value.fans = isFollowing.value 
      ? (userData.value.fans || 0) + 1 
      : Math.max(0, (userData.value.fans || 0) - 1);
    window.$message.success(isFollowing.value ? '关注成功' : '取消关注成功');
  } catch (error) {
    console.error('操作失败:', error);
    window.$message.error('操作失败，请重试');
  }
};

// 发送私信
const sendPrivateMessage = () => {
  emit('open-message', props.userId, userData.value.nickname, userData.value.avatarUrl);
};

// 显示关注列表
const showFollows = () => {
  emit('show-follows', props.userId);
};

// 显示粉丝列表
const showFans = () => {
  emit('show-fans', props.userId);
};

// 打开歌单
const openPlaylist = (id: number) => {
  emit('open-playlist', id);
};

// 打开专辑
const openAlbum = (id: number) => {
  emit('open-album', id);
};

// 打开歌手
const openArtist = (id: number) => {
  emit('open-artist', id);
};

// 组件挂载时加载数据
onMounted(() => {
  loadUserData();
  loadUserPlaylists();
});
</script>

<style lang="scss" scoped>
.user-profile {
  min-height: 100vh;
  background-color: var(--surface-container-hex);

  .user-header {
    position: relative;
    margin-bottom: 32px;

    .header-bg {
      position: relative;
      height: 200px;
      overflow: hidden;

      .bg-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .bg-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7));
      }
    }

    .user-info {
      position: relative;
      padding: 0 24px;
      margin-top: -80px;

      .avatar-section {
        margin-bottom: 16px;

        .avatar {
          width: 120px;
          height: 120px;
          border: 4px solid var(--surface-container-hex);
        }
      }

      .user-details {
        .nickname {
          font-size: 24px;
          font-weight: bold;
          margin-right: 8px;
        }

        .vip-badge {
          height: 24px;
        }

        .user-meta {
          margin: 8px 0;
          gap: 12px;

          .signature {
            max-width: 400px;
          }
        }

        .user-stats {
          margin: 16px 0;
          gap: 32px;

          .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            transition: color 0.3s;

            .stat-value {
              font-size: 18px;
              font-weight: bold;
            }

            .stat-label {
              font-size: 14px;
              color: var(--text-secondary);
              margin-top: 4px;
            }

            &:hover {
              color: var(--primary-color);
            }
          }
        }

        .action-buttons {
          gap: 12px;

          button {
            min-width: 100px;
          }
        }
      }
    }
  }

  .user-content {
    padding: 0 24px 24px;

    .content-tabs {
      display: flex;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 24px;

      .tab-item {
        padding: 12px 24px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-secondary);
        border-bottom: 2px solid transparent;
        transition: all 0.3s;

        &:hover {
          color: var(--primary-color);
        }

        &.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }
      }
    }

    .playlist-list,
    .album-list,
    .artist-list {
      .playlist-item,
      .album-item,
      .artist-item {
        margin-bottom: 24px;
      }

      .playlist-card,
      .album-card,
      .artist-card {
        cursor: pointer;
        transition: transform 0.3s;

        &:hover {
          transform: translateY(-4px);
        }

        .playlist-cover,
        .album-cover,
        .artist-cover {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .playlist-name,
        .album-name,
        .artist-name {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .playlist-count,
        .album-artist {
          color: var(--text-secondary);
        }
      }
    }

    .empty-content {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--text-secondary);
    }
  }
}

@media (max-width: 768px) {
  .user-profile {
    .user-header {
      .user-info {
        .user-details {
          .user-stats {
            gap: 24px;
          }

          .action-buttons {
            flex-wrap: wrap;
          }
        }
      }
    }

    .user-content {
      .content-tabs {
        .tab-item {
          padding: 10px 16px;
        }
      }
    }
  }
}
</style>