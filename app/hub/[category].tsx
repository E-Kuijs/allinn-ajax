import { useLocalSearchParams } from 'expo-router';

import { getHubCategory } from '@/src/core/hub-catalog';
import { HubCategoryScreenContent } from '@/src/core/hub-screens';

export default function HubCategoryScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const category = getHubCategory(params.category);

  return <HubCategoryScreenContent category={category} />;
}
