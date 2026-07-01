import type { MainNavigationTab } from '@/lib/navigation/navigationSettings';

type VisibleModuleMap = Record<MainNavigationTab, boolean>;

export const getNotificationSettingsVisibility = ({
  visibleModules,
}: {
  isNativeApp: boolean;
  visibleModules: VisibleModuleMap;
}) => {
  const showBrewingNotificationSound = visibleModules.brewing;
  const showCoffeeBeanNotifications = visibleModules.coffeeBean;
  const showGeneralNotificationSection = true;
  const hasVisibleNotificationSettings = true;

  return {
    hasVisibleNotificationSettings,
    showBrewingNotificationSound,
    showCoffeeBeanNotifications,
    showGeneralNotificationSection,
  };
};
