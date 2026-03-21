import { useAppContext } from '@/src/core/app-context';
import { HUB_CATEGORIES } from '@/src/core/hub-catalog';
import { HubAdminScreenContent } from '@/src/core/hub-screens';

export default function HubAdminScreen() {
  const { entitlements } = useAppContext();

  return <HubAdminScreenContent categories={HUB_CATEGORIES} canManage={entitlements.isDeveloper} />;
}
