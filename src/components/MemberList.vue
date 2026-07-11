<template>
  <div class="member-list">
    <div v-for="group in groups" :key="group.role" class="group-section">
      <div class="group-name">
        {{ group.role }} — {{ group.members.length }}
      </div>

      <div v-for="member in group.members" :key="member.id" class="member-item">
        <div class="avatar-wrapper">
          <div class="avatar" :style="{ background: member.color }">
            {{ member.initial }}
          </div>
          <div
            class="status-dot"
            :class="member.online ? 'online' : 'offline'"
          ></div>
        </div>
        <span class="member-name" :title="member.name">{{ member.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAppStore } from "@/store/useAppStore";

const store = useAppStore();

// 將成員依照角色分組，排序為：老師 (TEACHER) -> 助教 (TA) -> 學生 (STUDENT)
const groups = computed(() => {
  const teacherMembers = store.serverMembers.filter(
    (m) => m.role === "TEACHER",
  );
  const taMembers = store.serverMembers.filter((m) => m.role === "TA");
  const studentMembers = store.serverMembers.filter(
    (m) => m.role === "STUDENT",
  );

  const list = [];
  if (teacherMembers.length > 0) {
    list.push({
      role: "老師",
      members: teacherMembers.map((m) => mapMember(m, "#23a55a")),
    });
  }
  if (taMembers.length > 0) {
    list.push({
      role: "助教",
      members: taMembers.map((m) => mapMember(m, "#eb459e")),
    });
  }
  if (studentMembers.length > 0) {
    list.push({
      role: "學生",
      members: studentMembers.map((m) => mapMember(m, "var(--brand-color)")),
    });
  }
  return list;
});

function mapMember(m: any, defaultColor: string) {
  const name = m.username || "未知使用者";
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  // 優先使用 Store 中的隨機色彩產生器，依 User ID 維持色調一致，若無則採用角色預設色
  const color = store.getRandomColor
    ? store.getRandomColor(m.userId || m.id || name)
    : defaultColor;
  return {
    id: m.userId || m.id || Math.random().toString(),
    name,
    initial,
    color,
    online: true, // 預設全部顯示為在線狀態
  };
}
</script>

<style scoped>
.member-list {
  width: 265px;
  flex-shrink: 0;
  box-sizing: border-box;
  background: var(--bg-main);
  padding: 16px 8px;
  overflow-y: auto;
  height: 100%;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.group-section {
  margin-bottom: 16px;
}

.group-name {
  padding: 8px 8px 4px;
  color: #949ba4;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.member-item:hover {
  background: #35373c;
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.status-dot {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 3px solid var(--bg-dark);
  position: absolute;
  bottom: -1px;
  right: -1px;
}

.online {
  background: #23a55a;
}

.offline {
  background: #80848e;
}

.member-name {
  color: #949ba4;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-item:hover .member-name {
  color: #dbdee1;
}
</style>
