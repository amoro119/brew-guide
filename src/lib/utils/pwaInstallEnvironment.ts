'use client';

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export const getIsIOS = () => {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

export const getIsStandalone = () => {
  if (typeof window === 'undefined') return false;

  const isStandaloneMode = window.matchMedia?.(
    '(display-mode: standalone)'
  )?.matches;
  const isIOSStandalone =
    (navigator as NavigatorWithStandalone).standalone === true;

  return Boolean(isStandaloneMode || isIOSStandalone);
};

export const getIsWeChat = () => {
  if (typeof navigator === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent || '');
};

export const getIsAndroid = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
};

export const getIsDesktop = () => {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  return !isMobile;
};

export const canShowIOSPWAInstallGuide = () =>
  getIsIOS() && !getIsStandalone() && !getIsWeChat();
