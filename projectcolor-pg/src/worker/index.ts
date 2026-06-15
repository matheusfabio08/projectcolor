import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { serve } from "@hono/node-server";
import { addBusinessDays } from "date-fns";
import { queryAll, queryFirst, queryRun, queryInsert } from "./db.js";
import {
  CreatePORequestSchema,
  PreparationRequestSchema,
  BatchPreparationRequestSchema,
  ProductionRequestSchema,
  DryerRequestSchema,
  UntanglingRequestSchema,
  RollingRequestSchema,
  QualityRequestSchema,
  LaboratoryRequestSchema,
  Box4RequestSchema,
  Box5RequestSchema,
  Box6RequestSchema,
  CreateEmployeeRequestSchema,
  FabricQualityInspectionSchema,
} from "../shared/types.js";
import { createHash, randomUUID } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

const SESSION_COOKIE_NAME = "colortim_session";

type Variables = { user?: any };

const app = new Hono<{ Variables: Variables }>();

app.use(
  "/*",
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Session-Token"],
    exposeHeaders: ["Set-Cookie"],
  })
);

const authMiddleware = async (c: any, next: any) => {
  const sessionId =
    getCookie(c, SESSION_COOKIE_NAME) || c.req.header("X-Session-Token");

  if (
    !sessionId ||
    sessionId === "undefined" ||
    sessionId === "null" ||
    Number.isNaN(Number(sessionId))
  ) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await queryFirst(
    "SELECT id, username, name, email, role, is_active FROM users WHERE id = $1 AND is_active = TRUE",
    [Number(sessionId)]
  );

  if (!user) return c.json({ error: "Unauthorized" }, 401);

  c.set("user", user);
  await next();
};

app.post("/api/auth/login", async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) {
    return c.json({ error: "Usuário e senha são obrigatórios" }, 400);
  }

  const user = await queryFirst(
    "SELECT * FROM users WHERE username = $1 AND is_active = TRUE",
    [username]
  );

  if (!user || !user.password_hash) {
    return c.json({ error: "Usuário ou senha inválidos" }, 401);
  }

  if (!verifyPassword(password, user.password_hash)) {
    return c.json({ error: "Usuário ou senha inválidos" }, 401);
  }

  setCookie(c, SESSION_COOKIE_NAME, String(user.id), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60,
  });

  return c.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    },
    sessionToken: user.id,
  });
});

app.get("/api/auth/me", async (c) => {
  const sessionId =
    getCookie(c, SESSION_COOKIE_NAME) || c.req.header("X-Session-Token");

  if (
    !sessionId ||
    sessionId === "undefined" ||
    sessionId === "null" ||
    Number.isNaN(Number(sessionId))
  ) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const user = await queryFirst(
    "SELECT id, username, name, email, role, is_active FROM users WHERE id = $1 AND is_active = TRUE",
    [Number(sessionId)]
  );

  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json(user);
});

app.post("/api/auth/logout", async (c) => {
  deleteCookie(c, SESSION_COOKIE_NAME);
  return c.json({ success: true });
});

app.get("/api/dashboard/kpis", authMiddleware, async (c) => {
  const today = new Date().toISOString().split("T")[0];

  const activeOps = await queryFirst(
    "SELECT COUNT(*) as count FROM production_orders WHERE is_completed = FALSE"
  );
  const overdueOps = await queryFirst(
    "SELECT COUNT(*) as count FROM production_orders WHERE is_completed = FALSE AND expected_date < $1",
    [today]
  );
  const completedToday = await queryFirst(
    "SELECT COUNT(*) as count FROM production_orders WHERE is_completed = TRUE AND updated_at::DATE = $1",
    [today]
  );
  const totalOps = await queryFirst(
    "SELECT COUNT(*) as count FROM production_orders"
  );

  const total = Number(totalOps?.count) || 0;
  const todayCount = Number(completedToday?.count) || 0;
  const productivity = total > 0 ? (todayCount / total) * 100 : 0;

  return c.json({
    active_ops: Number(activeOps?.count) || 0,
    overdue_ops: Number(overdueOps?.count) || 0,
    completed_today: todayCount,
    productivity_rate: Math.round(productivity),
  });
});

app.get("/api/production-orders/next-op-number", authMiddleware, async (c) => {
  const lastOP = await queryFirst(
    "SELECT op_number FROM production_orders ORDER BY id DESC LIMIT 1"
  );

  let nextOPNumber = "001";
  if (lastOP?.op_number) {
    const numeric = String(lastOP.op_number).match(/^(\d+)/)?.[1] ?? "0";
    nextOPNumber = String(parseInt(numeric, 10) + 1).padStart(3, "0");
  }

  return c.json({ next_op_number: nextOPNumber });
});

app.get("/api/production-orders", authMiddleware, async (c) => {
  const status = c.req.query("status");
  const search = c.req.query("search");
  const requiresLab = c.req.query("requires_lab");

  let query = "SELECT * FROM production_orders WHERE 1=1";
  const params: any[] = [];
  let idx = 1;

  if (status) {
    query += ` AND status = $${idx++}`;
    params.push(status);
  }

  if (requiresLab === "true") {
    query += " AND requires_lab = TRUE";
  }

  if (search) {
    query += ` AND (op_number ILIKE $${idx} OR client ILIKE $${idx + 1} OR color ILIKE $${idx + 2})`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    idx += 3;
  }

  query += " ORDER BY created_at DESC";
  const rows = await queryAll(query, params);
  return c.json(rows);
});

app.get("/api/production-orders/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const op = await queryFirst("SELECT * FROM production_orders WHERE id = $1", [id]);
  if (!op) return c.json({ error: "Production order not found" }, 404);

  const items = await queryAll(
    "SELECT * FROM production_orders WHERE sheet_id = $1 ORDER BY op_number",
    [op.sheet_id]
  );
  const history = await queryAll(
    "SELECT * FROM activity_log WHERE op_id = $1 ORDER BY created_at ASC",
    [id]
  );

  return c.json({
    ...op,
    items: items.map((item: any) => ({
      id: item.id,
      material: item.material,
      quantity: item.quantity,
      unit: item.unit,
      individual_op: item.op_number,
      requires_lab: item.requires_lab,
    })),
    history,
  });
});

app.get("/api/production-sheets/:sheetNumber", authMiddleware, async (c) => {
  const sheetNumber = c.req.param("sheetNumber");
  const sheet = await queryFirst(
    "SELECT * FROM production_sheets WHERE sheet_number = $1",
    [sheetNumber]
  );
  if (!sheet) return c.json({ error: "Production sheet not found" }, 404);

  const ops = await queryAll(
    "SELECT * FROM production_orders WHERE sheet_id = $1 ORDER BY op_number",
    [sheet.id]
  );

  return c.json({
    ...sheet,
    op_number: sheet.sheet_number,
    items: ops.map((op: any) => ({
      material: op.material,
      quantity: op.quantity,
      unit: op.unit,
      individual_op: op.op_number,
    })),
  });
});

app.post("/api/production-orders", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = CreatePORequestSchema.parse(body);

  const lastSheet = await queryFirst(
    "SELECT sheet_number FROM production_sheets ORDER BY id DESC LIMIT 1"
  );
  let sheetNumber = "SHEET-001";
  if (lastSheet?.sheet_number) {
    const lastNum = parseInt(String(lastSheet.sheet_number).split("-")[1] || "0", 10);
    sheetNumber = `SHEET-${String(lastNum + 1).padStart(3, "0")}`;
  }

  const entryDate = validated.entry_date ? new Date(validated.entry_date) : new Date();
  const expectedDate = validated.expected_date
    ? new Date(validated.expected_date)
    : addBusinessDays(entryDate, 5);

  const sheetId = await queryInsert(
    `INSERT INTO production_sheets
    (sheet_number, client, color, order_number, description, entry_date, expected_date, created_by_user_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [
      sheetNumber,
      validated.client,
      validated.color,
      validated.order_number || null,
      validated.description || null,
      entryDate.toISOString().split("T")[0],
      expectedDate.toISOString().split("T")[0],
      user.id,
    ]
  );

  const lastOP = await queryFirst(
    "SELECT op_number FROM production_orders ORDER BY id DESC LIMIT 1"
  );
  let nextOPBase = 1;
  if (lastOP?.op_number) {
    const numeric = String(lastOP.op_number).match(/^(\d+)/)?.[1] ?? "0";
    nextOPBase = parseInt(numeric, 10) + 1;
  }

  const createdOPs: any[] = [];
  for (let i = 0; i < validated.items.length; i++) {
    const item = validated.items[i];
    const opNumber = String(nextOPBase + i).padStart(3, "0");

    const opId = await queryInsert(
      `INSERT INTO production_orders
      (sheet_id, op_number, client, color, order_number, entry_date, expected_date,
      material, quantity, unit, requires_lab, requires_fabric_quality,
      status, current_stage, responsible_user_id, description,
      region_jaragua, region_brusque, region_gaspar, fiber_id, is_dual_fiber, fiber2_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING id`,
      [
        sheetId,
        opNumber,
        validated.client,
        validated.color,
        validated.order_number || null,
        entryDate.toISOString().split("T")[0],
        expectedDate.toISOString().split("T")[0],
        item.material,
        item.quantity ?? null,
        item.unit ?? null,
        item.requires_lab ?? false,
        item.requires_fabric_quality ?? false,
        "almoxarifado",
        "almoxarifado",
        user.id,
        validated.description || null,
        validated.region_jaragua ?? false,
        validated.region_brusque ?? false,
        validated.region_gaspar ?? false,
        validated.fiber_id ?? null,
        validated.is_dual_fiber ?? false,
        validated.fiber2_id ?? null,
      ]
    );

    await queryRun(
      "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES ($1,$2,$3,$4,$5)",
      [opId, "almoxarifado", "created", user.id, `OP ${opNumber} criada`]
    );

    createdOPs.push({ id: opId, op_number: opNumber });
  }

  return c.json({ success: true, sheet_number: sheetNumber, ops: createdOPs }, 201);
});

app.put("/api/production-orders/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const validated = CreatePORequestSchema.parse(body);

  const op = await queryFirst("SELECT * FROM production_orders WHERE id = $1", [id]);
  if (!op) return c.json({ error: "OP not found" }, 404);

  const sheetId = op.sheet_id;
  const oldOPs = await queryAll(
    "SELECT * FROM production_orders WHERE sheet_id = $1 ORDER BY op_number",
    [sheetId]
  );

  const entryDate = validated.entry_date ? new Date(validated.entry_date) : new Date();
  const expectedDate = validated.expected_date
    ? new Date(validated.expected_date)
    : addBusinessDays(entryDate, 5);

  await queryRun(
    `UPDATE production_sheets SET client=$1, color=$2, order_number=$3, description=$4,
    entry_date=$5, expected_date=$6, updated_at=NOW() WHERE id=$7`,
    [
      validated.client,
      validated.color,
      validated.order_number || null,
      validated.description || null,
      entryDate.toISOString().split("T")[0],
      expectedDate.toISOString().split("T")[0],
      sheetId,
    ]
  );

  await queryRun("DELETE FROM production_orders WHERE sheet_id = $1", [sheetId]);

  const lastOP = await queryFirst(
    "SELECT op_number FROM production_orders ORDER BY id DESC LIMIT 1"
  );
  let nextOPBase = 1;
  if (lastOP?.op_number) {
    const numeric = String(lastOP.op_number).match(/^(\d+)/)?.[1] ?? "0";
    nextOPBase = parseInt(numeric, 10) + 1;
  }

  for (let i = 0; i < validated.items.length; i++) {
    const item = validated.items[i];
    const oldOP = oldOPs[i];
    const opNumber = oldOP?.op_number || String(nextOPBase + i).padStart(3, "0");

    const newOpId = await queryInsert(
      `INSERT INTO production_orders
      (sheet_id, op_number, client, color, order_number, entry_date, expected_date,
      material, quantity, unit, requires_lab, requires_fabric_quality,
      status, current_stage, responsible_user_id, description,
      region_jaragua, region_brusque, region_gaspar, fiber_id, is_dual_fiber, fiber2_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING id`,
      [
        sheetId,
        opNumber,
        validated.client,
        validated.color,
        validated.order_number || null,
        entryDate.toISOString().split("T")[0],
        expectedDate.toISOString().split("T")[0],
        item.material,
        item.quantity ?? null,
        item.unit ?? null,
        item.requires_lab ?? false,
        item.requires_fabric_quality ?? false,
        oldOP?.status || "almoxarifado",
        oldOP?.current_stage || "almoxarifado",
        oldOP?.responsible_user_id || null,
        validated.description || null,
        validated.region_jaragua ?? false,
        validated.region_brusque ?? false,
        validated.region_gaspar ?? false,
        validated.fiber_id ?? null,
        validated.is_dual_fiber ?? false,
        validated.fiber2_id ?? null,
      ]
    );

    await queryRun(
      "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES ($1,$2,$3,$4,$5)",
      [newOpId, "almoxarifado", "updated", c.get("user").id, `OP ${opNumber} atualizada`]
    );
  }

  return c.json({ success: true });
});

app.delete("/api/production-orders/:id", authMiddleware, async (c) => {
  const opId = c.req.param("id");
  const op = await queryFirst("SELECT * FROM production_orders WHERE id = $1", [opId]);
  if (!op) return c.json({ error: "OP not found" }, 404);

  const sheetId = op.sheet_id;
  const opsInSheet = await queryAll(
    "SELECT * FROM production_orders WHERE sheet_id = $1",
    [sheetId]
  );

  for (const o of opsInSheet) {
    for (const tbl of [
      "po_preparation",
      "po_production",
      "po_dryer",
      "po_untangling",
      "po_rolling",
      "po_quality",
      "po_laboratory",
      "activity_log",
      "po_in_progress",
    ]) {
      await queryRun(`DELETE FROM ${tbl} WHERE op_id = $1`, [o.id]);
    }
  }

  await queryRun("DELETE FROM production_orders WHERE sheet_id = $1", [sheetId]);
  await queryRun("DELETE FROM production_sheets WHERE id = $1", [sheetId]);
  return c.json({ success: true });
});

app.post("/api/almoxarifado/start", authMiddleware, async (c) => {
  const { op_id, stage, box_number, machine } = await c.req.json();

  const existing = await queryFirst(
    "SELECT id FROM po_in_progress WHERE op_id = $1",
    [op_id]
  );
  if (existing) return c.json({ error: "OP already in progress" }, 400);

  await queryRun(
    "INSERT INTO po_in_progress (op_id, stage, box_number, machine) VALUES ($1,$2,$3,$4)",
    [op_id, stage || "almoxarifado", box_number || null, machine || null]
  );
  return c.json({ success: true }, 201);
});

app.post("/api/almoxarifado/complete", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const { op_id } = await c.req.json();

  const inProgress = await queryFirst(
    "SELECT * FROM po_in_progress WHERE op_id = $1",
    [op_id]
  );
  if (!inProgress) return c.json({ error: "OP not in progress" }, 404);

  const op = await queryFirst("SELECT * FROM production_orders WHERE id = $1", [op_id]);
  if (!op) return c.json({ error: "OP not found" }, 404);

  const nextStatus = op.requires_fabric_quality
    ? "qualidade_malhas"
    : op.requires_lab
    ? "laboratorio"
    : "preparacao";

  await queryRun(
    "UPDATE production_orders SET status=$1, current_stage=$2, updated_at=NOW() WHERE id=$3",
    [nextStatus, "almoxarifado", op_id]
  );
  await queryRun("DELETE FROM po_in_progress WHERE op_id = $1", [op_id]);
  await queryRun(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES ($1,$2,$3,$4)",
    [op_id, "almoxarifado", "completed", user.id]
  );
  return c.json({ success: true });
});

app.post("/api/preparation", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = PreparationRequestSchema.parse(body);

  await queryRun(
    `INSERT INTO po_preparation (op_id, employee_ids, start_time, end_time, splices, total_weight, destination_box)
    VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      validated.po_id,
      JSON.stringify(validated.employee_meters),
      validated.start_time,
      validated.end_time,
      JSON.stringify(validated.splices),
      validated.total_weight,
      validated.destination_box,
    ]
  );

  let nextStatus = "producao";
  if (validated.destination_box === "Box 4") nextStatus = "box4";
  else if (validated.destination_box === "Box 5") nextStatus = "box5";
  else if (validated.destination_box === "Box 6") nextStatus = "box6";

  await queryRun(
    "UPDATE production_orders SET status=$1, current_stage=$2, updated_at=NOW() WHERE id=$3",
    [nextStatus, "preparacao", validated.po_id]
  );
  await queryRun(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES ($1,$2,$3,$4)",
    [validated.po_id, "preparacao", "completed", user.id]
  );
  return c.json({ success: true });
});

app.post("/api/preparation/batch", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = BatchPreparationRequestSchema.parse(body);
  const userId = user.id;

  const lastBatch = await queryFirst(
    "SELECT batch_number FROM preparation_batches ORDER BY id DESC LIMIT 1"
  );
  let batchNumber = "LOTE-001";
  if (lastBatch?.batch_number) {
    const lastNum = parseInt(String(lastBatch.batch_number).split("-")[1] || "0", 10);
    batchNumber = `LOTE-${String(lastNum + 1).padStart(3, "0")}`;
  }

  const batchId = await queryInsert(
    `INSERT INTO preparation_batches (batch_number, color, total_weight, destination_box, employee_ids, splices, start_time, end_time)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [
      batchNumber,
      validated.color,
      validated.total_weight,
      validated.destination_box,
      JSON.stringify(validated.employee_meters),
      JSON.stringify(validated.splices),
      validated.start_time,
      validated.end_time,
    ]
  );

  for (const op of validated.ops) {
    await queryRun(
      "INSERT INTO batch_ops (batch_id, op_id, meters_in_batch) VALUES ($1,$2,$3)",
      [batchId, op.op_id ?? op.op_id, op.meters]
    );

    await queryRun(
      `INSERT INTO po_preparation (op_id, employee_ids, start_time, end_time, splices, total_weight, destination_box)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        op.op_id ?? op.op_id,
        JSON.stringify(validated.employee_meters),
        validated.start_time,
        validated.end_time,
        JSON.stringify(validated.splices),
        op.meters,
        validated.destination_box,
      ]
    );

    let nextStatus = "producao";
    if (validated.destination_box === "Box 4") nextStatus = "box4";
    else if (validated.destination_box === "Box 5") nextStatus = "box5";
    else if (validated.destination_box === "Box 6") nextStatus = "box6";

    await queryRun(
      "UPDATE production_orders SET status=$1, current_stage=$2, updated_at=NOW() WHERE id=$3",
      [nextStatus, "preparacao", op.op_id ?? op.op_id]
    );
    await queryRun(
      "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES ($1,$2,$3,$4,$5)",
      [op.op_id ?? op.op_id, "preparacao", "completed_in_batch", userId, `Lote ${batchNumber}`]
    );
  }

  return c.json({ success: true, batch_number: batchNumber });
});

app.get("/api/preparation/available-for-batch", authMiddleware, async (c) => {
  const color = c.req.query("color");
  if (!color) return c.json({ error: "Color parameter required" }, 400);

  const rows = await queryAll(
    "SELECT * FROM production_orders WHERE color = $1 AND status = 'preparacao' ORDER BY entry_date ASC",
    [color]
  );
  return c.json(rows);
});

app.post("/api/preparation/create-lots", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const { parent_op_id, num_lots, lot_meters } = await c.req.json();

  if (!parent_op_id || !num_lots || !lot_meters || lot_meters.length !== num_lots) {
    return c.json({ error: "Invalid parameters" }, 400);
  }

  const parentOP = await queryFirst(
    "SELECT * FROM production_orders WHERE id = $1",
    [parent_op_id]
  );
  if (!parentOP) return c.json({ error: "Parent OP not found" }, 404);

  const createdLots: any[] = [];
  for (let i = 0; i < num_lots; i++) {
    const lotNumber = i + 1;
    const meters = lot_meters[i];
    const newOPNumber = `${parentOP.op_number}-L${lotNumber}`;

    const lotOpId = await queryInsert(
      `INSERT INTO production_orders
      (sheet_id, op_number, client, color, order_number, entry_date, expected_date,
      material, quantity, unit, requires_lab, status, current_stage, responsible_user_id,
      description, lot_number, parent_op_id, lot_meters)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
      [
        parentOP.sheet_id,
        newOPNumber,
        parentOP.client,
        parentOP.color,
        parentOP.order_number,
        parentOP.entry_date,
        parentOP.expected_date,
        parentOP.material,
        meters,
        parentOP.unit,
        parentOP.requires_lab,
        "preparacao",
        "preparacao",
        user.id,
        parentOP.description,
        lotNumber,
        parent_op_id,
        meters,
      ]
    );

    createdLots.push({ id: lotOpId, op_number: newOPNumber, lot_number: lotNumber });

    await queryRun(
      "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES ($1,$2,$3,$4,$5)",
      [lotOpId, "preparacao", "lot_created", user.id, `Lote ${lotNumber} de ${num_lots} criado a partir da OP ${parentOP.op_number}`]
    );
  }

  await queryRun(
    "UPDATE production_orders SET status='concluido', is_completed=TRUE, updated_at=NOW() WHERE id=$1",
    [parent_op_id]
  );
  await queryRun(
    "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES ($1,$2,$3,$4,$5)",
    [parent_op_id, "preparacao", "split_into_lots", user.id, `Dividida em ${num_lots} lotes`]
  );

  return c.json({ success: true, lots: createdLots });
});

app.post("/api/production", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const validated = ProductionRequestSchema.parse(await c.req.json());

  await queryRun(
    `INSERT INTO po_production (op_id, box_number, machine, operator, has_adjustment, start_date, end_date, meters_produced)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      validated.po_id,
      validated.box_number,
      validated.machine,
      validated.operator,
      validated.has_adjustment,
      validated.start_date,
      validated.end_date,
      validated.meters_produced,
    ]
  );

  await queryRun(
    "UPDATE production_orders SET status=$1, current_stage=$2, updated_at=NOW() WHERE id=$3",
    ["secadora", "producao", validated.po_id]
  );
  await queryRun(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES ($1,$2,$3,$4)",
    [validated.po_id, "producao", "completed", user.id]
  );
  return c.json({ success: true });
});

app.post("/api/dryer", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const validated = DryerRequestSchema.parse(await c.req.json());

  await queryRun("INSERT INTO po_dryer (op_id, destination) VALUES ($1,$2)", [
    validated.po_id,
    validated.destination,
  ]);
  await queryRun(
    "UPDATE production_orders SET status=$1, current_stage=$2, updated_at=NOW() WHERE id=$3",
    [validated.destination, "secadora", validated.po_id]
  );
  await queryRun(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES ($1,$2,$3,$4)",
    [validated.po_id, "secadora", "completed", user.id]
  );
  return c.json({ success: true });
});

app.post("/api/untangling", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const validated = UntanglingRequestSchema.parse(await c.req.json());

  await queryRun(
    `INSERT INTO po_untangling (op_id, num_employees, meters_per_employee, employee_times, start_time, end_time)
    VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      validated.po_id,
      validated.num_employees,
      validated.meters_per_employee,
      JSON.stringify(validated.employee_times),
      validated.start_time,
      validated.end_time,
    ]
  );
  await queryRun(
    "UPDATE production_orders SET status=$1, current_stage=$2, updated_at=NOW() WHERE id=$3",
    ["enrolagem", "destrinchagem", validated.po_id]
  );
  await queryRun(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES ($1,$2,$3,$4)",
    [validated.po_id, "destrinchagem", "completed", user.id]
  );
  return c.json({ success: true });
});

app.post("/api/rolling", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const validated = RollingRequestSchema.parse(await c.req.json());

  await queryRun(
    `INSERT INTO po_rolling (op_id, employee_ids, num_splices, num_rolls, issue_description, start_time, end_time)
    VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      validated.po_id,
      JSON.stringify(validated.employee_ids),
      validated.num_splices,
      validated.num_rolls,
      validated.issue_description || null,
      validated.start_time,
      validated.end_time,
    ]
  );
  await queryRun(
    "UPDATE production_orders SET status=$1, current_stage=$2, updated_at=NOW() WHERE id=$3",
    ["qualidade", "enrolagem", validated.po_id]
  );
  await queryRun(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES ($1,$2,$3,$4)",
    [validated.po_id, "enrolagem", "completed", user.id]
  );
  return c.json({ success: true });
});

app.post("/api/quality", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const validated = QualityRequestSchema.parse(await c.req.json());

  await queryRun(
    "INSERT INTO po_quality (op_id, rolls_sent, meters_per_roll, discrepancy) VALUES ($1,$2,$3,$4)",
    [validated.po_id, validated.rolls_sent, validated.meters_per_roll, validated.discrepancy || null]
  );
  await queryRun(
    "UPDATE production_orders SET status=$1, current_stage=$2, is_completed=TRUE, updated_at=NOW() WHERE id=$3",
    ["concluido", "qualidade", validated.po_id]
  );
  await queryRun(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES ($1,$2,$3,$4)",
    [validated.po_id, "qualidade", "completed", user.id]
  );
  return c.json({ success: true });
});

app.post("/api/laboratory", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const validated = LaboratoryRequestSchema.parse(await c.req.json());

  await queryRun(
    `INSERT INTO po_laboratory (op_id, num_batches, is_recipe_ready, recipe_origin_date, description, is_approved, start_time, end_time)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      validated.po_id,
      validated.num_batches ?? null,
      validated.is_recipe_ready,
      validated.recipe_origin_date || null,
      validated.description || null,
      validated.is_approved,
      validated.start_time,
      validated.end_time,
    ]
  );

  const nextStatus = validated.is_approved ? "preparacao" : "laboratorio";
  await queryRun(
    "UPDATE production_orders SET status=$1, current_stage=$2, updated_at=NOW() WHERE id=$3",
    [nextStatus, "laboratorio", validated.po_id]
  );
  await queryRun(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES ($1,$2,$3,$4)",
    [validated.po_id, "laboratorio", validated.is_approved ? "approved" : "processed", user.id]
  );
  return c.json({ success: true });
});

app.delete("/api/laboratory/:id", authMiddleware, async (c) => {
  await queryRun("DELETE FROM po_laboratory WHERE id = $1", [c.req.param("id")]);
  return c.json({ success: true });
});

app.get("/api/laboratory/records", authMiddleware, async (c) => {
  const rows = await queryAll(
    `SELECT po.*,
    lab.id as lab_record_id, lab.num_batches, lab.is_recipe_ready, lab.recipe_origin_date,
    lab.description as lab_description, lab.is_approved,
    lab.start_time as lab_start_time, lab.end_time as lab_end_time,
    lab.created_at as lab_processed_at
    FROM production_orders po
    LEFT JOIN po_laboratory lab ON po.id = lab.op_id
    WHERE po.requires_lab = TRUE AND po.lot_number IS NULL AND po.parent_op_id IS NULL
    ORDER BY po.created_at DESC`
  );
  return c.json(rows);
});

app.get("/api/laboratory/kpis", authMiddleware, async (c) => {
  const totalCompleted = await queryFirst("SELECT COUNT(*) as count FROM po_laboratory");
  const readyRecipes = await queryFirst("SELECT COUNT(*) as count FROM po_laboratory WHERE is_recipe_ready = TRUE");
  const newRecipes = await queryFirst("SELECT COUNT(*) as count FROM po_laboratory WHERE is_recipe_ready = FALSE OR is_recipe_ready IS NULL");
  const avgBatches = await queryFirst("SELECT AVG(num_batches) as avg FROM po_laboratory WHERE num_batches IS NOT NULL AND num_batches > 0");
  const totalBatches = await queryFirst("SELECT SUM(num_batches) as total FROM po_laboratory WHERE num_batches IS NOT NULL");
  const onTimeCount = await queryFirst(
    `SELECT COUNT(*) as count FROM po_laboratory
    WHERE end_time::TIMESTAMP - start_time::TIMESTAMP <= INTERVAL '2 days'`
  );
  const pendingOPs = await queryFirst(
    `SELECT COUNT(*) as count FROM production_orders
    WHERE requires_lab = TRUE AND lot_number IS NULL AND parent_op_id IS NULL
    AND id NOT IN (SELECT op_id FROM po_laboratory)`
  );

  const total = Number(totalCompleted?.count) || 0;
  const onTime = Number(onTimeCount?.count) || 0;
  return c.json({
    total_completed: total,
    ready_recipes: Number(readyRecipes?.count) || 0,
    new_recipes: Number(newRecipes?.count) || 0,
    avg_batches: Math.round((Number(avgBatches?.avg) || 0) * 10) / 10,
    total_batches: Number(totalBatches?.total) || 0,
    on_time_count: onTime,
    pending_ops: Number(pendingOPs?.count) || 0,
    yield_rate: total > 0 ? Math.round((onTime / total) * 100) : 0,
  });
});

app.get("/api/pesagem/records", authMiddleware, async (c) => {
  const waiting = await queryAll(
    `SELECT po.*, lab.id as lab_record_id
    FROM production_orders po
    INNER JOIN po_laboratory lab ON po.id = lab.op_id
    LEFT JOIN po_pesagem pes ON po.id = pes.op_id
    WHERE po.requires_lab = TRUE AND po.lot_number IS NULL AND po.parent_op_id IS NULL
    AND po.recipe_weighed = FALSE AND pes.id IS NULL
    ORDER BY po.created_at DESC`
  );
  const inProgress = await queryAll(
    `SELECT po.*, pes.id as pesagem_id, pes.start_time as pesagem_start_time, pes.end_time as pesagem_end_time
    FROM production_orders po
    INNER JOIN po_pesagem pes ON po.id = pes.op_id
    WHERE po.requires_lab = TRUE AND po.lot_number IS NULL AND po.parent_op_id IS NULL
    AND pes.start_time IS NOT NULL AND pes.end_time IS NULL
    ORDER BY pes.start_time DESC`
  );
  const completed = await queryAll(
    `SELECT po.*, pes.id as pesagem_id, pes.start_time as pesagem_start_time, pes.end_time as pesagem_end_time
    FROM production_orders po
    INNER JOIN po_pesagem pes ON po.id = pes.op_id
    WHERE po.requires_lab = TRUE AND po.lot_number IS NULL AND po.parent_op_id IS NULL
    AND pes.end_time IS NOT NULL
    ORDER BY pes.end_time DESC
    LIMIT 50`
  );
  return c.json({ waiting, inProgress, completed });
});

app.post("/api/pesagem/start", authMiddleware, async (c) => {
  const { op_id } = await c.req.json();
  if (!op_id) return c.json({ error: "op_id is required" }, 400);

  await queryRun(
    "UPDATE production_orders SET recipe_weighed=TRUE, updated_at=NOW() WHERE id=$1",
    [op_id]
  );
  await queryRun(
    "INSERT INTO po_pesagem (op_id, start_time) VALUES ($1, NOW())",
    [op_id]
  );
  return c.json({ success: true }, 201);
});

app.post("/api/pesagem/complete", authMiddleware, async (c) => {
  const { op_id, employee_id, notes } = await c.req.json();
  if (!op_id) return c.json({ error: "op_id is required" }, 400);

  await queryRun(
    `UPDATE po_pesagem SET end_time=NOW(), employee_id=$1, notes=$2, updated_at=NOW()
    WHERE op_id=$3 AND end_time IS NULL`,
    [employee_id, notes || null, op_id]
  );
  await queryRun(
    "UPDATE production_orders SET recipe_weighed=TRUE, updated_at=NOW() WHERE id=$1",
    [op_id]
  );
  return c.json({ success: true });
});

async function getBoxRecords(stage: string) {
  const waiting = await queryAll(
    `SELECT * FROM production_orders WHERE status = $1 ORDER BY created_at ASC`,
    [stage]
  );

  const inProgressData: any[] = [];
  for (const op of waiting) {
    const status = await queryFirst(
      "SELECT * FROM po_in_progress WHERE op_id = $1 AND stage = $2",
      [op.id, stage]
    );
    if (status) inProgressData.push(op);
  }

  const waitingData = waiting.filter(
    (op: any) => !inProgressData.find((ip) => ip.id === op.id)
  );

  const allOPs = await queryAll(
    "SELECT * FROM production_orders ORDER BY created_at DESC"
  );

  const completed = allOPs.filter((op: any) => {
    if (op.status !== "producao" || op.current_stage !== stage) return false;
    const diff = (new Date().getTime() - new Date(op.updated_at).getTime()) / 3600000;
    return diff <= 24;
  });

  return { waiting: waitingData, inProgress: inProgressData, completed };
}

app.get("/api/box4/records", authMiddleware, async (c) =>
  c.json(await getBoxRecords("box4"))
);
app.get("/api/box5/records", authMiddleware, async (c) =>
  c.json(await getBoxRecords("box5"))
);
app.get("/api/box6/records", authMiddleware, async (c) =>
  c.json(await getBoxRecords("box6"))
);

async function processBox(table: string, stage: string, validated: any, userId: string) {
  await queryRun(
    `INSERT INTO ${table} (op_id, employee_id, has_adjustment, adjustment_details, is_reprocess, reprocess_reason, timestamp)
    VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      validated.po_id,
      validated.employee_id,
      validated.has_adjustment,
      validated.adjustment_details || null,
      validated.is_reprocess,
      validated.reprocess_reason || null,
      validated.timestamp,
    ]
  );

  await queryRun(
    "UPDATE production_orders SET status=$1, current_stage=$2, updated_at=NOW() WHERE id=$3",
    ["producao", stage, validated.po_id]
  );
  await queryRun(
    "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES ($1,$2,$3,$4,$5)",
    [
      validated.po_id,
      stage,
      "processed",
      userId,
      `Processado por ${validated.employee_id}${validated.has_adjustment ? " - Com ajuste" : ""}${validated.is_reprocess ? " - Reprocesso" : ""}`,
    ]
  );
}

app.post("/api/box4", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const validated = Box4RequestSchema.parse(await c.req.json());
  await processBox("po_box4", "box4", validated, user.id);
  return c.json({ success: true });
});
app.post("/api/box5", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const validated = Box5RequestSchema.parse(await c.req.json());
  await processBox("po_box5", "box5", validated, user.id);
  return c.json({ success: true });
});
app.post("/api/box6", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const validated = Box6RequestSchema.parse(await c.req.json());
  await processBox("po_box6", "box6", validated, user.id);
  return c.json({ success: true });
});

app.get("/api/fabric-quality/inspections", authMiddleware, async (c) => {
  const rows = await queryAll(
    "SELECT * FROM fabric_quality_inspections ORDER BY inspection_date DESC"
  );
  return c.json(rows);
});

app.get("/api/fabric-quality/inspections/:id", authMiddleware, async (c) => {
  const inspection = await queryFirst(
    "SELECT * FROM fabric_quality_inspections WHERE id = $1",
    [c.req.param("id")]
  );
  if (!inspection) return c.json({ error: "Inspection not found" }, 404);
  return c.json(inspection);
});

app.post("/api/fabric-quality/inspections", authMiddleware, async (c) => {
  const validated = FabricQualityInspectionSchema.parse(await c.req.json());

  const lastIns = await queryFirst(
    "SELECT inspection_number FROM fabric_quality_inspections ORDER BY id DESC LIMIT 1"
  );
  let inspectionNumber = "INS-001";
  if (lastIns?.inspection_number) {
    const lastNum = parseInt(String(lastIns.inspection_number).split("-")[1] || "0", 10);
    inspectionNumber = `INS-${String(lastNum + 1).padStart(3, "0")}`;
  }

  await queryRun(
    `INSERT INTO fabric_quality_inspections
    (inspection_number, item_description, weight, destination_sector, observations, defect_image_url, employee_name, inspection_date)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      inspectionNumber,
      validated.item_description,
      validated.weight,
      validated.destination_sector,
      validated.observations || null,
      validated.defect_image_url || null,
      validated.employee_name,
      validated.inspection_date,
    ]
  );
  return c.json({ success: true, inspection_number: inspectionNumber }, 201);
});

app.put("/api/fabric-quality/inspections/:id", authMiddleware, async (c) => {
  const validated = FabricQualityInspectionSchema.parse(await c.req.json());
  await queryRun(
    `UPDATE fabric_quality_inspections
    SET item_description=$1, weight=$2, destination_sector=$3, observations=$4,
    defect_image_url=$5, employee_name=$6, inspection_date=$7, updated_at=NOW()
    WHERE id=$8`,
    [
      validated.item_description,
      validated.weight,
      validated.destination_sector,
      validated.observations || null,
      validated.defect_image_url || null,
      validated.employee_name,
      validated.inspection_date,
      c.req.param("id"),
    ]
  );
  return c.json({ success: true });
});

app.delete("/api/fabric-quality/inspections/:id", authMiddleware, async (c) => {
  await queryRun("DELETE FROM fabric_quality_inspections WHERE id = $1", [c.req.param("id")]);
  return c.json({ success: true });
});

app.get("/api/employees", authMiddleware, async (c) => {
  const sector = c.req.query("sector");
  let query = "SELECT * FROM employees WHERE is_active = TRUE";
  const params: any[] = [];

  if (sector && sector !== "Todos") {
    query += " AND (sector = $1 OR sector = 'Todos')";
    params.push(sector);
  }

  query += " ORDER BY sector, name";
  return c.json(await queryAll(query, params));
});

app.post("/api/employees", authMiddleware, async (c) => {
  const validated = CreateEmployeeRequestSchema.parse(await c.req.json());
  await queryRun(
    "INSERT INTO employees (name, sector, is_active) VALUES ($1,$2,TRUE)",
    [validated.name, validated.sector]
  );
  return c.json({ success: true }, 201);
});

app.put("/api/employees/:id", authMiddleware, async (c) => {
  const { name, sector, is_active } = await c.req.json();
  await queryRun(
    "UPDATE employees SET name=$1, sector=$2, is_active=$3, updated_at=NOW() WHERE id=$4",
    [name, sector, is_active, c.req.param("id")]
  );
  return c.json({ success: true });
});

app.delete("/api/employees/:id", authMiddleware, async (c) => {
  await queryRun("DELETE FROM employees WHERE id = $1", [c.req.param("id")]);
  return c.json({ success: true });
});

app.get("/api/admin/users", authMiddleware, async (c) => {
  return c.json(await queryAll("SELECT * FROM users ORDER BY created_at DESC"));
});

app.post("/api/admin/users", authMiddleware, async (c) => {
  const currentUser = c.get("user") as any;
  if (currentUser.role !== "Admin") {
    return c.json({ error: "Apenas administradores podem criar usuários" }, 403);
  }

  const { username, password, name, email, role } = await c.req.json();
  if (!username || !password || !name || !email || !role) {
    return c.json({ error: "Todos os campos são obrigatórios" }, 400);
  }

  const existing = await queryFirst("SELECT id FROM users WHERE username = $1", [username]);
  if (existing) return c.json({ error: "Nome de usuário já existe" }, 400);

  const userId = randomUUID();
  await queryRun(
    `INSERT INTO users (id, mocha_user_id, username, password_hash, name, email, role, is_active)
    VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)`,
    [userId, `local-${userId}`, username, hashPassword(password), name, email, role]
  );
  return c.json({ success: true, id: userId }, 201);
});

const port = Number(process.env.PORT || 3000);
console.log(`ProjectColor API rodando em http://localhost:${port}`);
serve({ fetch: app.fetch, port });
