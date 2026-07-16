<script setup lang="ts">
import { toasts } from "../toast";
</script>
<template>
  <div class="toast-host" aria-live="polite" aria-atomic="true">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      :data-tone="toast.tone"
    >
      {{ toast.message }}
    </div>
  </div>
</template>
