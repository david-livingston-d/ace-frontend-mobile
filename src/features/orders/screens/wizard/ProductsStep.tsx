import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { ProductBrowseScreen } from '@/features/products/screens/ProductBrowseScreen';
import { StepHeader } from '../../components/StepHeader';
import type { WizardNav } from './types';

/**
 * Step 2 is Task 4's product browser itself — the same categories, the same
 * SKU typeahead, the same multi-size picker sheet, writing to the same draft
 * store. Only the two exits differ: back returns to the customer step, and the
 * floating cart badge opens the wizard's own cart instead of re-entering the
 * root `NewOrder` route.
 */
export function ProductsStep() {
  const navigation = useNavigation<WizardNav>();
  return (
    <ProductBrowseScreen
      header={<StepHeader step={2} hint="Add products and sizes." />}
      onBack={() => navigation.goBack()}
      onOpenCart={() => navigation.navigate('CartStep')}
    />
  );
}
