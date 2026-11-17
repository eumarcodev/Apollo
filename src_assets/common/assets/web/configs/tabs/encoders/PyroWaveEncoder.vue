<script setup>
import { ref } from 'vue'
import Checkbox from "../../../Checkbox.vue";

const props = defineProps([
  'platform',
  'config',
])

const config = ref(props.config)
</script>

<template>
  <div id="pyrowave-encoder" class="config-page">
    <div class="alert alert-warning" role="alert">{{ $t('config.pyrowave_tab_note') }}</div>

    <!-- Enable PyroWave -->
    <Checkbox class="mb-3"
              id="pyrowave"
              locale-prefix="config"
              v-model="config.pyrowave"
              default="false"
    ></Checkbox>

    <!-- PyroWave packet size -->
    <div class="mb-3">
      <label for="pyrowave_packet_size" class="form-label">{{ $t('config.pyrowave_packet_size') }}</label>
      <input type="number" class="form-control" id="pyrowave_packet_size" placeholder="1200" min="400" max="1300"
             v-model="config.pyrowave_packet_size" />
      <div class="form-text">{{ $t('config.pyrowave_packet_size_desc') }}</div>
    </div>

    <!-- PyroWave minimum frame size -->
    <div class="mb-3">
      <label for="pyrowave_min_frame_kb" class="form-label">{{ $t('config.pyrowave_min_frame_kb') }}</label>
      <input type="number" class="form-control" id="pyrowave_min_frame_kb" placeholder="16" min="1" max="4096"
             v-model="config.pyrowave_min_frame_kb" />
      <div class="form-text">{{ $t('config.pyrowave_min_frame_kb_desc') }}</div>
    </div>

    <!-- Sharper still screen -->
    <Checkbox class="mb-3"
              id="pyrowave_static_boost"
              locale-prefix="config"
              v-model="config.pyrowave_static_boost"
              default="true"
    ></Checkbox>

    <!-- PyroWave GPU queue priority -->
    <div class="mb-3">
      <label for="pyrowave_priority" class="form-label">{{ $t('config.pyrowave_priority') }}</label>
      <select id="pyrowave_priority" class="form-select" v-model="config.pyrowave_priority">
        <option value="low">{{ $t('config.pyrowave_priority_low') }}</option>
        <option value="medium">{{ $t('config.pyrowave_priority_medium') }}</option>
        <option value="high">{{ $t('config.pyrowave_priority_high') }}</option>
        <option value="realtime">{{ $t('config.pyrowave_priority_realtime') }}</option>
      </select>
      <div class="form-text">{{ $t('config.pyrowave_priority_desc') }}</div>
    </div>

    <!-- PyroWave simulated packet loss (tests only) -->
    <div class="mb-3">
      <label for="pyrowave_simulated_loss" class="form-label">{{ $t('config.pyrowave_simulated_loss') }}</label>
      <input type="number" class="form-control" id="pyrowave_simulated_loss" placeholder="0" min="0" max="100" step="0.5"
             v-model="config.pyrowave_simulated_loss" />
      <div class="form-text">{{ $t('config.pyrowave_simulated_loss_desc') }}</div>
    </div>
  </div>
</template>

<style scoped>
</style>
