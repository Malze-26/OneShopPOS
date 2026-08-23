import { Model } from 'mongoose';
import { ICategory } from '../models/Category';
import { IProduct } from '../models/Product';

/**
 * Every SKU reads as a three-letter category prefix, a dash, then a running
 * number zero-padded to three digits — e.g. SDW-004 for "Soft Drinks & Water".
 *
 * The prefix lives on the Category rather than being recomputed per product,
 * so renaming a category never splits its products across two prefixes and
 * every product in a category always shares the same three leading letters.
 *
 * The number comes from a counter on the same Category document, bumped with a
 * single atomic `$inc`. Numbers are therefore never reused: deleting a product
 * or moving it elsewhere retires its code rather than freeing it for the next
 * product, so a SKU printed on an old receipt always means the same thing.
 */
export const SKU_PREFIX_LENGTH = 3;
export const SKU_NUMBER_PAD = 3;

/** Matches a prefix on its own, e.g. SDW. */
export const SKU_PREFIX_PATTERN = /^[A-Z]{3}$/;

/**
 * A category with more than 999 products grows a fourth digit rather than
 * running out of codes, so the tail is `[0-9]{3,}` and not `[0-9]{3}`.
 */
export const SKU_PATTERN = /^[A-Z]{3}-[0-9]{3,}$/;

/** Retries cover a number claimed concurrently by another request. */
const SKU_ISSUE_ATTEMPTS = 5;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const VOWELS = /[AEIOU]/g;

export function formatSku(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(SKU_NUMBER_PAD, '0')}`;
}

/** True when `sku` is well-formed AND belongs to the given category prefix. */
export function skuBelongsToPrefix(sku: string | undefined | null, prefix: string): boolean {
  const value = sku?.trim().toUpperCase() ?? '';
  return SKU_PATTERN.test(value) && value.slice(0, SKU_PREFIX_LENGTH) === prefix;
}

export function isDuplicateKeyError(err: unknown, field: string): boolean {
  const e = err as { code?: number; keyPattern?: Record<string, unknown> };
  return e?.code === 11000 && (!e.keyPattern || field in e.keyPattern);
}

/**
 * Prefix candidates for a category name, best first.
 *
 * "Soft Drinks & Water" -> SDW (initials), "Dairy" -> DAI (first letters).
 * The alphabet sweep at the end guarantees a free prefix exists unless the
 * store already has 26 categories sharing the same two opening letters.
 */
export function suggestPrefixes(categoryName: string): string[] {
  const words = categoryName.toUpperCase().split(/[^A-Z]+/).filter(Boolean);
  const squashed = words.join('') || 'PRODUCT';

  const out: string[] = [];
  const push = (candidate: string) => {
    const value = (candidate + 'XXX').slice(0, SKU_PREFIX_LENGTH);
    if (SKU_PREFIX_PATTERN.test(value) && !out.includes(value)) out.push(value);
  };

  const initials = words.map((w) => w[0]).join('');
  if (initials.length >= SKU_PREFIX_LENGTH) push(initials);
  push(squashed);
  if (words.length >= 2) {
    push(words[0][0] + words[1].slice(0, 2));
    push(words[0].slice(0, 2) + words[1][0]);
  }
  push(squashed[0] + squashed.slice(1).replace(VOWELS, ''));

  const base = (squashed + 'XX').slice(0, 2);
  for (const letter of LETTERS) push(base + letter);

  return out;
}

async function loadCategory(
  CategoryModel: Model<ICategory>,
  categoryName: string
): Promise<ICategory> {
  const category = await CategoryModel.findOne({ name: categoryName });
  if (!category) throw new Error(`Category "${categoryName}" not found`);
  return category;
}

/**
 * Returns the category's stored prefix, assigning one on first use so that
 * categories created before this feature existed pick one up here.
 */
export async function getCategoryPrefix(
  CategoryModel: Model<ICategory>,
  categoryName: string
): Promise<string> {
  const category = await loadCategory(CategoryModel, categoryName);
  if (category.skuPrefix) return category.skuPrefix;

  const taken = new Set(
    (await CategoryModel.find({ skuPrefix: { $type: 'string' } }).select('skuPrefix').lean())
      .map((c) => c.skuPrefix as string)
  );

  for (const candidate of suggestPrefixes(category.name)) {
    if (taken.has(candidate)) continue;
    category.skuPrefix = candidate;
    try {
      await category.save();
      return candidate;
    } catch (err) {
      // Another request claimed this prefix first — fall through to the next.
      if (!isDuplicateKeyError(err, 'skuPrefix')) throw err;
      taken.add(candidate);
    }
  }

  throw new Error(`No free SKU prefix available for category "${category.name}"`);
}

/** Highest number already present on a product under a prefix; 0 when unused. */
export async function highestSkuNumber(
  ProductModel: Model<IProduct>,
  prefix: string
): Promise<number> {
  const existing = await ProductModel.find({ sku: new RegExp(`^${prefix}-[0-9]+$`) })
    .select('sku')
    .lean();

  return existing.reduce((max, p) => {
    const n = Number(p.sku.slice(SKU_PREFIX_LENGTH + 1));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
}

/**
 * The counter's starting point: whichever is higher, the counter itself or the
 * largest number any product already carries under this prefix.
 *
 * Reading both on every issue costs one indexed lookup, and it is what makes
 * the guarantee hold no matter how a product got into the collection — the
 * backfill, a CSV import, a seed script, a restore. The counter alone would go
 * stale against writes that never went through this code.
 */
async function counterFloor(
  category: ICategory,
  ProductModel: Model<IProduct>,
  prefix: string
): Promise<number> {
  return Math.max(category.skuSequence ?? 0, await highestSkuNumber(ProductModel, prefix));
}

/** Takes the next number for a category and advances its counter atomically. */
async function claimSkuNumber(
  CategoryModel: Model<ICategory>,
  ProductModel: Model<IProduct>,
  categoryName: string,
  prefix: string
): Promise<number> {
  const category = await loadCategory(CategoryModel, categoryName);
  const floor = await counterFloor(category, ProductModel, prefix);

  // Pipeline update so the read-max-and-increment happens inside the database:
  // two requests adding products at once cannot land on the same number.
  const claimed = await CategoryModel.findOneAndUpdate(
    { _id: category._id },
    [{ $set: { skuSequence: { $add: [{ $max: [{ $ifNull: ['$skuSequence', 0] }, floor] }, 1] } } }],
    { new: true }
  );

  return claimed?.skuSequence ?? floor + 1;
}

/**
 * The SKU the next product in this category would receive, without claiming
 * it. Used by the Add/Edit form to show the code as soon as a category is
 * picked; the number is confirmed when the product is actually saved.
 */
export async function previewSku(
  CategoryModel: Model<ICategory>,
  ProductModel: Model<IProduct>,
  categoryName: string
): Promise<{ sku: string; prefix: string }> {
  const prefix = await getCategoryPrefix(CategoryModel, categoryName);
  const category = await loadCategory(CategoryModel, categoryName);
  const floor = await counterFloor(category, ProductModel, prefix);
  return { sku: formatSku(prefix, floor + 1), prefix };
}

/**
 * Saves a product under a freshly claimed SKU for `categoryName`.
 *
 * The client never gets to choose the code — whatever the Add form previewed
 * is only a preview, and the authoritative number is taken here. With one
 * manager working at a time the two agree; when they don't, the claimed number
 * wins and the saved product carries it.
 */
export async function issueSku<T>(
  CategoryModel: Model<ICategory>,
  ProductModel: Model<IProduct>,
  categoryName: string,
  save: (sku: string) => Promise<T>
): Promise<T> {
  const prefix = await getCategoryPrefix(CategoryModel, categoryName);
  const claim = async () =>
    formatSku(prefix, await claimSkuNumber(CategoryModel, ProductModel, categoryName, prefix));

  let sku = await claim();

  for (let attempt = 1; ; attempt++) {
    try {
      return await save(sku);
    } catch (err) {
      // Only a request that claimed the same number at the same instant can
      // land here; claiming again steps past it.
      if (attempt >= SKU_ISSUE_ATTEMPTS || !isDuplicateKeyError(err, 'sku')) throw err;
      sku = await claim();
    }
  }
}
