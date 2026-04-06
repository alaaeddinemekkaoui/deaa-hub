const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, fn, maxRetries = 5, initialDelayMs = 1500) {
  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt > maxRetries) {
        throw error;
      }

      const message = error?.message || String(error);
      console.warn(
        `⚠️ ${label} failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`
      );
      console.warn(`   ↳ ${message.split('\n')[0]}`);
      await sleep(delay);
      delay *= 2;
    }
  }
}

function readLocalDatabaseUrl() {
  const envPath = path.resolve(__dirname, '..', '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  const line = content
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith('DATABASE_URL='));

  if (!line) {
    throw new Error('DATABASE_URL not found in backend/.env');
  }

  return line.split('=', 2)[1].trim().replace(/^"|"$/g, '');
}

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function tableRef(tableName) {
  return `public.${quoteIdent(tableName)}`;
}

function topoSortTables(tableNames, dependencies) {
  const inDegree = new Map();
  const graph = new Map();

  for (const t of tableNames) {
    inDegree.set(t, 0);
    graph.set(t, new Set());
  }

  for (const [child, parents] of dependencies.entries()) {
    for (const parent of parents) {
      if (!inDegree.has(child) || !inDegree.has(parent)) continue;
      if (!graph.get(parent).has(child)) {
        graph.get(parent).add(child);
        inDegree.set(child, inDegree.get(child) + 1);
      }
    }
  }

  const queue = [];
  for (const [table, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(table);
  }

  const ordered = [];
  while (queue.length > 0) {
    const current = queue.shift();
    ordered.push(current);

    for (const next of graph.get(current)) {
      inDegree.set(next, inDegree.get(next) - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }

  // Fallback for cycles (self-references, etc.)
  if (ordered.length < tableNames.length) {
    const remaining = tableNames.filter((t) => !ordered.includes(t));
    return [...ordered, ...remaining.sort()];
  }

  return ordered;
}

async function main() {
  const localUrl = readLocalDatabaseUrl();
  const neonUrl = process.env.NEON_DATABASE_URL;

  if (!neonUrl) {
    throw new Error('Please set NEON_DATABASE_URL before running this script.');
  }

  const local = new PrismaClient({ datasources: { db: { url: localUrl } } });
  const neon = new PrismaClient({ datasources: { db: { url: neonUrl } } });

  try {
    console.log('🔌 Connecting to local and Neon databases...');

    await withRetry('local connect', () => local.$connect(), 3, 500);
    await withRetry('neon connect', () => neon.$connect(), 6, 1000);

    const localDb = await withRetry('local db introspection', () =>
      local.$queryRawUnsafe('SELECT current_database() as db')
    );
    const neonDb = await withRetry('neon db introspection', () =>
      neon.$queryRawUnsafe('SELECT current_database() as db'),
      6,
      1000
    );
    console.log(`   Local DB: ${localDb[0].db}`);
    console.log(`   Neon DB:  ${neonDb[0].db}`);

    const localTables = await local.$queryRawUnsafe(`
      SELECT tablename AS table_name
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> '_prisma_migrations'
      ORDER BY tablename
    `);

    const neonTables = await withRetry('load Neon tables', () =>
      neon.$queryRawUnsafe(`
        SELECT tablename AS table_name
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> '_prisma_migrations'
        ORDER BY tablename
      `),
      6,
      1000
    );

    const localTableNames = localTables.map((t) => t.table_name);
    const neonTableSet = new Set(neonTables.map((t) => t.table_name));
    const tableNames = localTableNames.filter((t) => neonTableSet.has(t));

    if (!tableNames.length) {
      throw new Error('No common tables found between local and Neon databases.');
    }

    const fkRows = await local.$queryRawUnsafe(`
      SELECT
        tc.table_name AS child_table,
        ccu.table_name AS parent_table
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `);

    const deps = new Map();
    for (const t of tableNames) deps.set(t, new Set());
    for (const row of fkRows) {
      if (deps.has(row.child_table) && row.child_table !== row.parent_table) {
        deps.get(row.child_table).add(row.parent_table);
      }
    }

    const orderedTables = topoSortTables(tableNames, deps);
    const reverseTables = [...orderedTables].reverse();

    console.log('🧹 Truncating Neon tables (CASCADE)...');
    for (const table of reverseTables) {
      await withRetry(
        `truncate Neon table ${table}`,
        () => neon.$executeRawUnsafe(`TRUNCATE TABLE ${tableRef(table)} CASCADE;`),
        6,
        1000
      );
    }

    console.log('📦 Copying data table by table...');
    for (const table of orderedTables) {
      console.log(`   … reading local rows from ${table}`);
      const rows = await local.$queryRawUnsafe(
        `SELECT * FROM ${tableRef(table)} ORDER BY 1 ASC`
      );

      const enumColumnsRows = await withRetry(
        `load enum columns for ${table}`,
        () =>
          neon.$queryRawUnsafe(
            `
            SELECT column_name, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1
              AND data_type = 'USER-DEFINED'
          `,
            table
          ),
        6,
        1000
      );

      const enumColumns = new Map(
        enumColumnsRows.map((r) => [r.column_name, r.udt_name])
      );

      if (!rows.length) {
        console.log(`   • ${table}: 0 rows`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const quotedColumns = columns.map(quoteIdent).join(', ');

      const batchSize = 250;
      let inserted = 0;

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const placeholders = [];
        const values = [];

        batch.forEach((row, rowIndex) => {
          const valuePlaceholders = columns.map((_, colIndex) => {
            values.push(row[columns[colIndex]]);
            const colName = columns[colIndex];
            const pos = rowIndex * columns.length + colIndex + 1;
            const enumType = enumColumns.get(colName);

            if (enumType) {
              return `CAST($${pos} AS ${quoteIdent(enumType)})`;
            }

            return `$${pos}`;
          });
          placeholders.push(`(${valuePlaceholders.join(', ')})`);
        });

        const insertSql = `
          INSERT INTO ${tableRef(table)} (${quotedColumns})
          VALUES ${placeholders.join(', ')}
        `;

        await withRetry(
          `insert batch into ${table}`,
          () => neon.$executeRawUnsafe(insertSql, ...values),
          6,
          1000
        );
        inserted += batch.length;
      }

      // Reset serial sequence on id columns if present
      if (columns.includes('id')) {
        console.log(`   … resetting id sequence for ${table}`);
        await withRetry(
          `reset id sequence for ${table}`,
          () =>
            neon.$executeRawUnsafe(`
              SELECT setval(
                pg_get_serial_sequence('${tableRef(table)}', 'id'),
                COALESCE((SELECT MAX(id) FROM ${tableRef(table)}), 1),
                (SELECT COUNT(*) > 0 FROM ${tableRef(table)})
              );
            `),
          6,
          1000
        );
      }

      console.log(`   • ${table}: ${inserted} rows`);
    }

    console.log('✅ Local data imported to Neon successfully.');
  } finally {
    await local.$disconnect();
    await neon.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
