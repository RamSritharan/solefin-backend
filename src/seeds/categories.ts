import { Category, CategoryType } from '../entities/Category';

interface SeedCategory {
  name: string;
  type: CategoryType;
  scheduleCLine: string | null;
}

const defaultCategories: SeedCategory[] = [
  // Expense categories (Schedule C aligned)
  { name: 'Advertising', type: CategoryType.EXPENSE, scheduleCLine: 'Line 8' },
  { name: 'Car and Truck Expenses', type: CategoryType.EXPENSE, scheduleCLine: 'Line 10' },
  { name: 'Commissions and Fees', type: CategoryType.EXPENSE, scheduleCLine: 'Line 11' },
  { name: 'Contract Labor', type: CategoryType.EXPENSE, scheduleCLine: 'Line 11' },
  { name: 'Insurance', type: CategoryType.EXPENSE, scheduleCLine: 'Line 15' },
  { name: 'Interest', type: CategoryType.EXPENSE, scheduleCLine: 'Line 16a' },
  { name: 'Legal and Professional Services', type: CategoryType.EXPENSE, scheduleCLine: 'Line 17' },
  { name: 'Office Expense', type: CategoryType.EXPENSE, scheduleCLine: 'Line 18' },
  { name: 'Rent or Lease', type: CategoryType.EXPENSE, scheduleCLine: 'Line 20a' },
  { name: 'Repairs and Maintenance', type: CategoryType.EXPENSE, scheduleCLine: 'Line 21' },
  { name: 'Supplies', type: CategoryType.EXPENSE, scheduleCLine: 'Line 22' },
  { name: 'Taxes and Licenses', type: CategoryType.EXPENSE, scheduleCLine: 'Line 23' },
  { name: 'Travel', type: CategoryType.EXPENSE, scheduleCLine: 'Line 24a' },
  { name: 'Meals', type: CategoryType.EXPENSE, scheduleCLine: 'Line 24b' },
  { name: 'Utilities', type: CategoryType.EXPENSE, scheduleCLine: 'Line 25' },
  { name: 'Wages', type: CategoryType.EXPENSE, scheduleCLine: 'Line 26' },
  { name: 'Other Expenses', type: CategoryType.EXPENSE, scheduleCLine: 'Line 27a' },

  // Income categories
  { name: 'Service Income', type: CategoryType.INCOME, scheduleCLine: null },
  { name: 'Product Sales', type: CategoryType.INCOME, scheduleCLine: null },
  { name: 'Consulting', type: CategoryType.INCOME, scheduleCLine: null },
  { name: 'Freelance', type: CategoryType.INCOME, scheduleCLine: null },
  { name: 'Interest Income', type: CategoryType.INCOME, scheduleCLine: null },
  { name: 'Other Income', type: CategoryType.INCOME, scheduleCLine: null },
];

export async function seedCategories(): Promise<void> {
  const count = await Category.count();
  if (count > 0) {
    console.log('Categories already seeded. Skipping.');
    return;
  }

  const rows = defaultCategories.map((cat) => ({
    name: cat.name,
    type: cat.type,
    scheduleCLine: cat.scheduleCLine,
    isCustom: false,
    userId: null,
  }));

  await Category.bulkCreate(rows);
  console.log(`Seeded ${rows.length} default categories.`);
}
