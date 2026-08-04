/**
 * MediTrack demo seed.
 *
 * Reuses the flavour of the legacy pharmacy.sql dump (companies like Cipla,
 * Sun Pharma, Med City; drugs like Novalo, novafol, Morfin, Declofien; users
 * admin/mark) but produces a modern, idempotent dataset that exercises every
 * derived-status branch and gives the dashboard/report screens real numbers
 * to render.
 *
 * Re-runnable: clears all tables (in FK-safe order) before inserting.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRUG_TYPES = ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'INHALER', 'OTHER'] as const;
const PAYMENT_MODES = ['CASH', 'CARD', 'UPI'] as const;
const CUSTOMER_NAMES = [
  'Walk-in',
  'Ravi Kumar',
  'Priya Sharma',
  'Amit Patel',
  'Sunita Rao',
  'Deepak Nair',
  'Anjali Gupta',
  'Vikram Singh',
  'Meera Iyer',
  'Rahul Verma',
  'Kavita Joshi'
];

function hashSync(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function main() {
  console.log('Clearing existing data...');
  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.purchaseItem.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.loginAudit.deleteMany(),
    prisma.drug.deleteMany(),
    prisma.company.deleteMany(),
    prisma.counter.deleteMany(),
    prisma.user.deleteMany()
  ]);

  console.log('Seeding users...');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@meditrack.dev',
        password: hashSync('Admin@123'),
        role: 'ADMIN',
        phone: '9800000000',
        address: 'Someplace India',
        dob: '1995-12-23',
        salary: 50000,
        active: true
      }
    }),
    prisma.user.create({
      data: {
        name: 'Mark',
        email: 'mark@meditrack.dev',
        password: hashSync('Mark@123'),
        role: 'PHARMACIST',
        phone: '01290789432',
        address: 'Bangalore India',
        dob: '1972-02-03',
        salary: 28000,
        active: true
      }
    }),
    prisma.user.create({
      data: {
        name: 'Clark Rao',
        email: 'clark@meditrack.dev',
        password: hashSync('Clark@123'),
        role: 'PHARMACIST',
        phone: '01147893423',
        address: 'Nowhere Earth-616',
        dob: '1971-02-03',
        salary: 26000,
        active: true
      }
    }),
    prisma.user.create({
      data: {
        name: 'Tony Stark',
        email: 'tony@meditrack.dev',
        password: hashSync('Tony@123'),
        role: 'PHARMACIST',
        phone: '011804368743',
        address: '10880 Malibu Point, Malibu, California',
        dob: '1977-08-07',
        salary: 30000,
        active: false
      }
    })
  ]);

  const admin = users[0];
  const activePharmacists = users.filter((u) => u.role === 'PHARMACIST' && u.active);
  const salesUsers = [admin, ...activePharmacists];

  console.log('Seeding companies...');
  const companyNames = [
    { name: 'Cipla', address: 'Mumbai, Maharashtra', phone: '02212903000', email: 'contact@cipla.example' },
    { name: 'Sun Pharma', address: 'Mysore, Karnataka', phone: '08212890784', email: 'sales@sunpharma.example' },
    { name: 'Med City', address: 'Nellore, Andhra Pradesh', phone: '08610114367', email: 'orders@medcity.example' },
    { name: 'Dr Reddys', address: 'Hyderabad, Telangana', phone: '04022834568', email: 'hello@drreddys.example' },
    { name: 'Lupin Labs', address: 'Pune, Maharashtra', phone: '02066123456', email: 'info@lupin.example' },
    { name: 'Zydus Life', address: 'Ahmedabad, Gujarat', phone: '07926868000', email: 'support@zydus.example' }
  ];
  const companies = [];
  for (const c of companyNames) {
    companies.push(await prisma.company.create({ data: c }));
  }

  console.log('Seeding drugs...');
  const drugNames = [
    'Novalo',
    'Novafol',
    'Morfin',
    'Declofien',
    'Breofin',
    'Paracet',
    'Amoxiclin',
    'Cetrizen',
    'Ibufen',
    'Metformax',
    'Losarex',
    'Panazol',
    'Azithrol',
    'Domstal',
    'Rablet',
    'Ondemet',
    'Levocet',
    'Montek',
    'Ecosprin',
    'Atorvast',
    'Telmisar',
    'Glimisave',
    'Pantocid',
    'Cefixime',
    'Doxyrol',
    'Ambroxil',
    'Cough-X',
    'Betnovate',
    'Silverex',
    'Neospor',
    'Insulinix',
    'Voltaren',
    'Dermazin',
    'Otoclin',
    'Nasovent',
    'Pulmocare',
    'Xylospray',
    'Ranitab',
    'Digoxil',
    'Clopigrel'
  ];

  interface DrugSeedPlan {
    name: string;
    type: (typeof DRUG_TYPES)[number];
    quantity: number;
    reorderLevel: number;
    expiryOffsetDays: number;
  }

  const plans: DrugSeedPlan[] = [];
  drugNames.forEach((name, idx) => {
    const type = DRUG_TYPES[idx % DRUG_TYPES.length];
    // Deliberately distribute across every derived status:
    // idx % 8 == 0 -> EXPIRED
    // idx % 8 == 1 -> OUT_OF_STOCK
    // idx % 8 == 2 -> EXPIRING_SOON
    // idx % 8 == 3 -> LOW_STOCK
    // else -> IN_STOCK
    const bucket = idx % 8;
    let quantity: number;
    let reorderLevel = 15;
    let expiryOffsetDays: number;

    if (bucket === 0) {
      quantity = randomInt(5, 40);
      expiryOffsetDays = -randomInt(1, 200); // already expired
    } else if (bucket === 1) {
      quantity = 0;
      expiryOffsetDays = randomInt(120, 500);
    } else if (bucket === 2) {
      quantity = randomInt(5, 60);
      expiryOffsetDays = randomInt(1, 89); // within 90 days
    } else if (bucket === 3) {
      quantity = randomInt(1, 15);
      reorderLevel = 20;
      expiryOffsetDays = randomInt(150, 500);
    } else {
      quantity = randomInt(40, 150);
      expiryOffsetDays = randomInt(150, 700);
    }

    plans.push({ name, type, quantity, reorderLevel, expiryOffsetDays });
  });

  const doses: Record<string, string> = {
    TABLET: '500mg',
    CAPSULE: '250mg',
    SYRUP: '100ml',
    INJECTION: '1ml',
    OINTMENT: '20g',
    DROPS: '10ml',
    INHALER: '200 doses',
    OTHER: 'as directed'
  };

  const places = ['N-Left', 'N-Right', 'S-Left', 'S-Right', 'E-Aisle', 'W-Aisle', 'Cold Storage'];

  const drugs = [];
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const company = companies[i % companies.length];
    const costPrice = round2(randomInt(2, 50) + Math.random());
    const sellingPrice = round2(costPrice * (1.2 + Math.random() * 0.6));
    const productionDate = daysFromNow(plan.expiryOffsetDays - randomInt(200, 700));
    const expirationDate = daysFromNow(plan.expiryOffsetDays);

    const drug = await prisma.drug.create({
      data: {
        name: plan.name,
        barcode: `MTB${String(890000000000 + i).padStart(13, '0')}`,
        type: plan.type,
        dose: doses[plan.type],
        code: `${(i + 1).toString(36)}${randomInt(10, 99)}`,
        costPrice,
        sellingPrice,
        companyId: company.id,
        productionDate,
        expirationDate,
        place: pick(places),
        quantity: plan.quantity,
        reorderLevel: plan.reorderLevel
      }
    });
    drugs.push(drug);
  }

  // Only sell/purchase drugs that are not already expired, so purchase/sale
  // history stays plausible.
  const sellableDrugs = drugs.filter((d) => d.expirationDate.getTime() > Date.now());

  console.log('Seeding purchases...');
  let purchaseCounter = 0;
  for (let i = 0; i < 40; i++) {
    const company = pick(companies);
    const companyDrugs = drugs.filter((d) => d.companyId === company.id);
    if (companyDrugs.length === 0) continue;

    const itemCount = randomInt(1, 4);
    const chosenDrugs = new Set<string>();
    const items: Array<{ drugId: string; quantity: number; unitCost: number; amount: number }> = [];
    let total = 0;

    for (let j = 0; j < itemCount; j++) {
      const drug = pick(companyDrugs);
      if (chosenDrugs.has(drug.id)) continue;
      chosenDrugs.add(drug.id);
      const quantity = randomInt(10, 100);
      const unitCost = drug.costPrice;
      const amount = round2(quantity * unitCost);
      total = round2(total + amount);
      items.push({ drugId: drug.id, quantity, unitCost, amount });
    }
    if (items.length === 0) continue;

    purchaseCounter += 1;
    const daysAgo = randomInt(1, 55);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    await prisma.purchase.create({
      data: {
        reference: `PO-${createdAt.getFullYear()}-${String(purchaseCounter).padStart(4, '0')}`,
        companyId: company.id,
        userId: admin.id,
        notes: pick(['Monthly restock', 'Emergency top-up', 'Quarterly order', 'New stock arrival', null]),
        total,
        createdAt,
        items: { create: items }
      }
    });
  }
  await prisma.counter.upsert({
    where: { id: `purchase-${new Date().getFullYear()}` },
    update: { value: purchaseCounter },
    create: { id: `purchase-${new Date().getFullYear()}`, value: purchaseCounter }
  });

  console.log('Seeding sales...');
  let saleCounter = 0;
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < 180; i++) {
    if (sellableDrugs.length === 0) break;
    const itemCount = randomInt(1, 4);
    const chosenDrugs = new Set<string>();
    const items: Array<{
      drugId: string;
      name: string;
      barcode: string;
      dose: string | null;
      quantity: number;
      unitPrice: number;
      amount: number;
    }> = [];
    let subtotal = 0;

    for (let j = 0; j < itemCount; j++) {
      const drug = pick(sellableDrugs);
      if (chosenDrugs.has(drug.id)) continue;
      chosenDrugs.add(drug.id);
      const quantity = randomInt(1, 6);
      const unitPrice = drug.sellingPrice;
      const amount = round2(quantity * unitPrice);
      subtotal = round2(subtotal + amount);
      items.push({
        drugId: drug.id,
        name: drug.name,
        barcode: drug.barcode,
        dose: drug.dose,
        quantity,
        unitPrice,
        amount
      });
    }
    if (items.length === 0) continue;

    const discount = Math.random() < 0.3 ? round2(subtotal * (0.02 + Math.random() * 0.08)) : 0;
    const taxRate = pick([0, 5, 12, 18]);
    const tax = round2((subtotal - discount) * (taxRate / 100));
    const total = round2(subtotal - discount + tax);

    saleCounter += 1;
    // Force the last 10 sales to today so the dashboard always shows activity.
    const daysAgo = saleCounter > 170 ? 0 : randomInt(0, 59);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59));

    await prisma.sale.create({
      data: {
        invoiceNo: `INV-${currentYear}-${String(saleCounter).padStart(4, '0')}`,
        userId: pick(salesUsers).id,
        customerName: pick(CUSTOMER_NAMES),
        customerPhone: Math.random() < 0.5 ? `9${randomInt(100000000, 999999999)}` : '',
        paymentMode: pick(PAYMENT_MODES),
        subtotal,
        discount,
        taxRate,
        tax,
        total,
        createdAt,
        items: { create: items }
      }
    });
  }
  await prisma.counter.upsert({
    where: { id: `sale-${currentYear}` },
    update: { value: saleCounter },
    create: { id: `sale-${currentYear}`, value: saleCounter }
  });

  console.log('Seeding messages...');
  const [adminUser, markUser, clarkUser] = users;
  const messageSeeds = [
    { from: adminUser, to: markUser, body: 'Welcome to MediTrack, Mark!' },
    { from: markUser, to: adminUser, body: 'Thank you, glad to be here.' },
    { from: adminUser, to: markUser, body: 'Please restock the antibiotics shelf today.' },
    { from: markUser, to: adminUser, body: 'On it, will update stock by evening.' },
    { from: adminUser, to: clarkUser, body: 'Welcome aboard, Clark!' },
    { from: clarkUser, to: adminUser, body: 'Excited to get started.' },
    { from: adminUser, to: markUser, body: 'Great job hitting the sales target this week.' },
    { from: markUser, to: adminUser, body: 'Thanks! The new POS flow really helps.' },
    { from: adminUser, to: clarkUser, body: 'Reminder: check expiring stock this week.' },
    { from: clarkUser, to: adminUser, body: 'Already flagged 3 items, will update the report.' }
  ];

  for (let i = 0; i < messageSeeds.length; i++) {
    const m = messageSeeds[i];
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - (messageSeeds.length - i));
    await prisma.message.create({
      data: {
        fromUserId: m.from.id,
        toUserId: m.to.id,
        body: m.body,
        createdAt,
        readAt: i % 3 === 0 ? null : createdAt
      }
    });
  }

  console.log('Seed complete.');
  console.log(`  Users: ${users.length}`);
  console.log(`  Companies: ${companies.length}`);
  console.log(`  Drugs: ${drugs.length}`);
  console.log(`  Purchases: ${purchaseCounter}`);
  console.log(`  Sales: ${saleCounter}`);
  console.log(`  Messages: ${messageSeeds.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
