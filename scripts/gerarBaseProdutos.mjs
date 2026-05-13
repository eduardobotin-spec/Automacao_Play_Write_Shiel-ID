import fs from 'fs';
import path from 'path';
import pkg from 'pg';
import process from 'process';

const { Client } = pkg;
const DEFAULT_INVOICES_DATABASE = 'testes-automatiz';

const MODULOS_CONSULTA = {
  consulta_full: {
    label: 'Consulta Full',
    // Quando ativo, substitui seleção avulsa.
    includes_module_keys: [
      'telefone',
      'endereco',
      'email',
      'dados_cadastrais',
      'beneficios_governo',
      'pep_listas',
      'impedidos_apostar',
    ],
  },
  telefone: { label: 'Telefone' },
  endereco: { label: 'Endereço' },
  email: { label: 'E-mail' },
  dados_cadastrais: { label: 'Dados cadastrais' },
  beneficios_governo: { label: 'Benefícios governo' },
  pep_listas: { label: 'PEP e listas' },
  impedidos_apostar: { label: 'Impedidos apostar' },
};

function numOrNull(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeKey(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function moduleKeysForServiceName(serviceName) {
  const n = normalizeKey(serviceName);

  // Mapeia nomes dos serviços do banco para módulos do painel.
  if (n === 'consulta full' || n === 'consulta completa') return ['consulta_full'];
  if (n === 'consulta telefone') return ['telefone'];
  if (n === 'consulta endereco' || n === 'consulta endereço') return ['endereco'];
  if (n === 'consulta email') return ['email'];
  if (n === 'consulta dados cadastrais') return ['dados_cadastrais'];
  if (n === 'consulta beneficios governo' || n === 'consulta benefícios governo') return ['beneficios_governo'];
  if (n === 'consulta pep listas' || n === 'consulta pep listas') return ['pep_listas'];
  if (n === 'consulta impedidos apostar') return ['impedidos_apostar'];

  return [];
}

function minPriceForProduct({ defaultPrice, invoiceLatestTotalPrice }) {
  const d = numOrNull(defaultPrice);
  if (d != null) return d;
  const i = numOrNull(invoiceLatestTotalPrice);
  if (i != null) return i;
  return null;
}

function stampLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function getDbConfig() {
  // Mantém compatibilidade com `services/limparBanco.js`, mas permite override via env.
  return {
    host: process.env.DB_HOST || '54.232.0.137',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'read_only_user',
    password: process.env.DB_PASS || 'password',
    database: process.env.DB_NAME || 'shielid',
  };
}

async function fetchServices(client) {
  const { rows } = await client.query('select * from services order by id asc');
  return rows;
}

async function fetchInvoiceItems(client) {
  // Campos mínimos para o entendimento e para agregação do total_price.
  const { rows } = await client.query(
    `select id, service_id, total_price, quantity_service, database, created_at, updated_at, item_type
     from invoices_itens
     where database = $1
     order by id asc`,
    [process.env.INVOICES_DATABASE || DEFAULT_INVOICES_DATABASE]
  );
  return rows;
}

function aggregateByServiceId(invoiceItems) {
  const agg = new Map();
  for (const it of invoiceItems) {
    const serviceId = numOrNull(it.service_id);
    if (serviceId == null) continue;

    const totalPrice = numOrNull(it.total_price) ?? 0;
    const quantity = numOrNull(it.quantity_service);

    const prev = agg.get(serviceId) ?? {
      total_price_sum: 0,
      invoices_itens_count: 0,
      total_price_min: null,
      total_price_max: null,
      total_price_latest: null,
      latest_invoice_item: null,
    };

    prev.total_price_sum += totalPrice;
    prev.invoices_itens_count += 1;
    prev.total_price_min =
      prev.total_price_min == null ? totalPrice : Math.min(prev.total_price_min, totalPrice);
    prev.total_price_max =
      prev.total_price_max == null ? totalPrice : Math.max(prev.total_price_max, totalPrice);
    prev.total_price_latest = totalPrice;
    prev.latest_invoice_item = {
      id: it.id,
      service_id: serviceId,
      total_price: totalPrice,
      quantity_service: quantity,
      database: it.database ?? null,
      item_type: it.item_type ?? null,
      created_at: it.created_at ?? null,
      updated_at: it.updated_at ?? null,
    };

    agg.set(serviceId, prev);
  }
  return agg;
}

function buildProductsJson({ services, invoiceAgg }) {
  const products = [];
  for (const s of services) {
    const id = numOrNull(s.id);
    if (id == null) continue;

    const inv = invoiceAgg.get(id) ?? null;
    const module_keys = moduleKeysForServiceName(s.service_name);
    const includes_module_keys =
      module_keys.includes('consulta_full') ? MODULOS_CONSULTA.consulta_full.includes_module_keys : [];
    const min_price = minPriceForProduct({
      defaultPrice: s.default_price,
      invoiceLatestTotalPrice: inv?.total_price_latest,
    });
    products.push({
      id,
      service_name: s.service_name ?? null,
      service_description: s.service_description ?? null,
      default_price: numOrNull(s.default_price),
      min_price,
      module_keys,
      includes_module_keys,
      is_eligible: typeof s.is_eligible === 'boolean' ? s.is_eligible : null,
      is_discount: typeof s.is_discount === 'boolean' ? s.is_discount : null,
      created_at: s.created_at ?? null,
      updated_at: s.updated_at ?? null,
      invoices: inv
        ? {
            total_price: inv.total_price_latest,
            total_price_latest: inv.total_price_latest,
            total_price_sum: Number(inv.total_price_sum.toFixed(10)),
            total_price_min: inv.total_price_min,
            total_price_max: inv.total_price_max,
            invoices_itens_count: inv.invoices_itens_count,
            latest_invoice_item: inv.latest_invoice_item,
          }
        : null,
    });
  }

  // Também inclui service_ids presentes em invoices_itens mas ausentes em services (para evidenciar gaps).
  const unknown = [];
  for (const [service_id, inv] of invoiceAgg.entries()) {
    if (products.some((p) => p.id === service_id)) continue;
    unknown.push({
      service_id,
      invoices: {
        total_price: inv.total_price_latest,
        total_price_latest: inv.total_price_latest,
        total_price_sum: Number(inv.total_price_sum.toFixed(10)),
        total_price_min: inv.total_price_min,
        total_price_max: inv.total_price_max,
        invoices_itens_count: inv.invoices_itens_count,
        latest_invoice_item: inv.latest_invoice_item,
      },
    });
  }
  unknown.sort((a, b) => a.service_id - b.service_id);

  return {
    meta: {
      generated_at: new Date().toISOString(),
      generated_at_local: stampLocal(),
      db_name: getDbConfig().database,
      source_tables: ['services', 'invoices_itens'],
      join_key: 'invoices_itens.service_id -> services.id',
      price_field: 'invoices_itens.total_price',
      invoices_database_filter: process.env.INVOICES_DATABASE || DEFAULT_INVOICES_DATABASE,
      aggregation: 'latest (per service_id) + sum/min/max',
      panel_modules: MODULOS_CONSULTA,
    },
    products,
    unknown_service_ids_in_invoices_itens: unknown,
  };
}

async function main() {
  const outDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'produtos.services.json');

  const client = new Client(getDbConfig());
  await client.connect();
  try {
    const services = await fetchServices(client);
    const invoiceItems = await fetchInvoiceItems(client);
    const invoiceAgg = aggregateByServiceId(invoiceItems);

    const json = buildProductsJson({ services, invoiceAgg });
    fs.writeFileSync(outPath, JSON.stringify(json, null, 2) + '\n', 'utf8');

    console.log(`OK: gerado ${path.relative(process.cwd(), outPath)} (services=${services.length}, invoices_itens=${invoiceItems.length})`);
    if (json.unknown_service_ids_in_invoices_itens.length) {
      console.log(`Aviso: existem ${json.unknown_service_ids_in_invoices_itens.length} service_id em invoices_itens sem correspondência em services.`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Falha ao gerar base de produtos:', e?.message ?? e);
  process.exit(1);
});

