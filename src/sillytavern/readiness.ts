import type { AppSettings, CharacterCard, ChatPreset } from './types';

export type SetupStepStatus = 'complete' | 'missing' | 'optional';

export interface SetupStep {
  status: SetupStepStatus;
  label: string;
  detail: string;
}

export interface SetupReadiness {
  canStartChat: boolean;
  canSend: boolean;
  missingReasons: string[];
  steps: {
    character: SetupStep;
    preset: SetupStep;
    primaryApi: SetupStep;
    worldbook: SetupStep;
    secondaryApi: SetupStep;
  };
}

export interface SetupReadinessInput {
  character: CharacterCard | null | undefined;
  preset: ChatPreset | null | undefined;
  lorebookCount: number;
  hasActiveChat: boolean;
  settings: AppSettings;
}

function hasPrimaryApi(settings: AppSettings): boolean {
  if (settings.apiSource === 'managed') return true;
  return Boolean(settings.api.baseUrl.trim() && settings.api.apiKey.trim() && settings.api.model.trim());
}

function hasSecondaryApi(settings: AppSettings): boolean {
  const secondary = settings.api.secondary;
  return Boolean(secondary?.enabled && secondary.baseUrl.trim() && secondary.apiKey.trim() && secondary.model.trim());
}

export function getSetupReadiness(input: SetupReadinessInput): SetupReadiness {
  const characterReady = Boolean(input.character);
  const presetReady = Boolean(input.preset);
  const primaryReady = hasPrimaryApi(input.settings);
  const managed = input.settings.apiSource === 'managed';
  const secondaryRequired = !managed && input.settings.apiMode === 'dual';
  const secondaryReady = hasSecondaryApi(input.settings);
  const canStartChat = characterReady && presetReady;
  const missingReasons = [
    !characterReady ? '请先导入并选择角色卡' : '',
    !presetReady ? '请先导入并选择对话预设' : '',
    !primaryReady ? '请完整配置主 API 地址、密钥与模型' : '',
  ].filter(Boolean);

  return {
    canStartChat,
    canSend: canStartChat && primaryReady && input.hasActiveChat,
    missingReasons,
    steps: {
      character: {
        status: characterReady ? 'complete' : 'missing',
        label: '角色卡',
        detail: characterReady ? `已选择 ${input.character?.name}` : '支持 SillyTavern PNG 与 Character Card V2 JSON',
      },
      preset: {
        status: presetReady ? 'complete' : 'missing',
        label: '对话预设',
        detail: presetReady ? `已选择 ${input.preset?.name}` : '导入一个 SillyTavern 对话预设',
      },
      primaryApi: {
        status: primaryReady ? 'complete' : 'missing',
        label: '主 API',
        detail: managed ? '使用站点托管聊天服务' : primaryReady ? `已配置 ${input.settings.api.model}` : '填写兼容 OpenAI 的地址、密钥与模型',
      },
      worldbook: {
        status: input.lorebookCount > 0 ? 'complete' : 'optional',
        label: '世界书',
        detail: input.lorebookCount > 0 ? `已启用 ${input.lorebookCount} 本` : '可选：导入背景设定与触发条目',
      },
      secondaryApi: {
        status: managed ? 'optional' : secondaryReady ? 'complete' : secondaryRequired ? 'missing' : 'optional',
        label: '次 API',
        detail: managed ? '托管模式由站点统一处理' : secondaryReady ? `已配置 ${input.settings.api.secondary?.model}` : '用于变量与总结；未配置时相应任务回退主 API',
      },
    },
  };
}
