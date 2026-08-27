import type { StockSummary } from '@/lib/api/types';

export type {
  ProductListItem,
  ProductDetail,
  ProductAttribute,
  VariantDetail,
  VariantAttributeValue,
  VariantSearchItem,
  StockSummary,
  CategoryOut,
} from '@/lib/api/types';

/** What a line looked like at the moment it was picked from a product's
 * variants — snapshotted (not a live reference) so the order draft store
 * (Task 5) never has to re-fetch the product just to render a line, and so a
 * later master-data change can never retroactively alter an already-picked
 * line (the same snapshot rule every other transaction in this app follows). */
export type LineSnapshot = {
  sku: string;
  productId: string;
  productName: string;
  variantLabel: string | null;
  attributeValues: { name: string; value: string; display: string }[];
  taxRate: string | null;
  price: { sellingPrice: string; taxInclusive: boolean } | null;
  stock: StockSummary | null;
};

/** One variant + quantity the picker sheet hands back to `onAdd` — only
 * entries with `qty > 0` are ever included. */
export type PickedLine = {
  variantId: string;
  qty: number;
  snapshot: LineSnapshot;
};
