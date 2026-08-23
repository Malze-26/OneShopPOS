/**
 * Backfill script — rewrites legacy SKUs into the category-derived format.
 *
 * Products created before SKUs were tied to categories carry ad-hoc codes
 * (`SKU-4F9K2LX0P`, `RICE-5KG-001`, …). This walks every category, gives it a
 * three-letter prefix if it has none, and renumbers the products under it so
 * they all read `PRE-001`, `PRE-002`, … Products that already match their
 * category's prefix keep the code they have.
 *
 *   npm run backfill:skus -- --dry-run            # report, change nothing
 *   npm run backfill:skus -- --tenant oneshop_keels
 *   npm run backfill:skus -- --all-tenants
 *
 * With neither --tenant nor --all-tenants it runs against the database named
 * in MONGODB_URI.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { getModels } from './db/tenantModels';
import { formatSku, getCategoryPrefix, SKU_PREFIX_LENGTH, skuBelongsToPrefix } from './utils/sku';

interface Options {
  dryRun: boolean;
  tenant?: string;
  allTenants: boolean;
}

function parseArgs(argv: string[]): Options {
  const tenantIndex = argv.indexOf('--tenant');
  return {
    dryRun: argv.includes('--dry-run'),
    tenant: tenantIndex >= 0 ? argv[tenantIndex + 1] : undefined,
    allTenants: argv.includes('--all-tenants'),
  };
}

async function backfillTenant(conn: mongoose.Connection, label: string, dryRun: boolean): Promise<number> {
  const { Category, Product } = getModels(conn);
  const categories = await Category.find({}).sort({ name: 1 });

  // The sku index is unique across the whole collection, not per category, so
  // a new code has to clear every SKU in the store — including the ones still
  // waiting their turn to be rewritten. Tracked here and kept current as codes
  // are handed out.
  const taken = new Set((await Product.find({}).select('sku').lean()).map((p) => p.sku));

  console.log(`\n=== ${label} — ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} ===`);
  let renumbered = 0;

  for (const category of categories) {
    const prefix = await getCategoryPrefix(Category, category.name);
    const products = await Product.find({ category: category.name }).sort({ createdAt: 1, _id: 1 });

    // Keep already-conforming codes exactly as they are, and start numbering
    // the rest above the highest one in use so nothing collides mid-run.
    const conforming = products.filter((p) => skuBelongsToPrefix(p.sku, prefix));
    const stale = products.filter((p) => !skuBelongsToPrefix(p.sku, prefix));

    let next = conforming.reduce(
      (max, p) => Math.max(max, Number(p.sku.slice(SKU_PREFIX_LENGTH + 1))),
      0
    );

    console.log(
      `${category.name} [${prefix}] — ${products.length} products, ${stale.length} to renumber`
    );

    for (const product of stale) {
      let sku: string;
      do {
        next += 1;
        sku = formatSku(prefix, next);
      } while (taken.has(sku));

      console.log(`  ${product.sku.padEnd(20)} -> ${sku}  (${product.name})`);
      taken.delete(product.sku);
      taken.add(sku);
      renumbered += 1;

      if (!dryRun) {
        product.sku = sku;
        await product.save();
      }
    }

    const sequence = Math.max(next, category.skuSequence ?? 0);
    if (!dryRun && category.skuSequence !== sequence) {
      category.skuSequence = sequence;
      await category.save();
    }
  }

  // Anything left outside a known category cannot be renumbered — a SKU needs
  // a category to take its letters from. Report it so it can be sorted by hand.
  const categoryNames = categories.map((c) => c.name);
  const orphans = await Product.find({ category: { $nin: categoryNames } }).select('sku name category');
  if (orphans.length > 0) {
    console.log(`\n  ${orphans.length} product(s) sit in a category that no longer exists:`);
    orphans.forEach((p) => console.log(`  - ${p.sku} "${p.name}" in "${p.category}"`));
  }

  console.log(`\n  ${renumbered} product(s) renumbered in ${label}.`);
  return renumbered;
}

async function main(): Promise<void> {
  const { dryRun, tenant, allTenants } = parseArgs(process.argv.slice(2));

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(mongoUri);
  if (dryRun) console.log('DRY RUN — no documents will be written.');

  try {
    if (allTenants) {
      const factoryDbName = process.env.TENANT_FACTORY_DB || 'oneshop-tenant-factory';
      const factoryDb = mongoose.connection.useDb(factoryDbName, { useCache: true });
      const tenants = await factoryDb.collection('tenants').find({}).toArray();

      for (const t of tenants) {
        const dbName = t.databaseName as string | undefined;
        if (!dbName) continue;
        await backfillTenant(
          mongoose.connection.useDb(dbName, { useCache: true }),
          `${t.businessName ?? dbName} (${dbName})`,
          dryRun
        );
      }
    } else if (tenant) {
      await backfillTenant(mongoose.connection.useDb(tenant, { useCache: true }), tenant, dryRun);
    } else {
      await backfillTenant(mongoose.connection, mongoose.connection.name, dryRun);
    }
  } finally {
    await mongoose.disconnect();
  }

  console.log(dryRun ? '\nDry run complete.' : '\nBackfill complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
