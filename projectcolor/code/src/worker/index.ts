import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
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
} from "@/shared/types";
import { addBusinessDays } from "date-fns";

const SESSION_COOKIE_NAME = "colortim_session";

type Variables = {
  user?: any;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("/*", cors({ 
  origin: (origin) => origin || "*", 
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Session-Token"],
  exposeHeaders: ["Set-Cookie"]
}));

// Custom auth middleware
const authMiddleware = async (c: any, next: any) => {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME) || c.req.header("X-Session-Token");
  
  if (!sessionId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await c.env.DB.prepare(
    "SELECT id, username, name, email, role, is_active FROM users WHERE id = ? AND is_active = 1"
  ).bind(sessionId).first();

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", user);
  await next();
};

// Auth routes
app.post("/api/auth/login", async (c) => {
  const body = await c.req.json();
  const { username, password } = body;

  if (!username || !password) {
    return c.json({ error: "Usuário e senha são obrigatórios" }, 400);
  }

  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE username = ? AND is_active = 1"
  ).bind(username).first();

  if (!user || !(user as any).password_hash) {
    return c.json({ error: "Usuário ou senha inválidos" }, 401);
  }

  const isValidPassword = await verifyPassword(password, (user as any).password_hash);

  if (!isValidPassword) {
    return c.json({ error: "Usuário ou senha inválidos" }, 401);
  }

  setCookie(c, SESSION_COOKIE_NAME, (user as any).id, {
    httpOnly: false, // Set to false for development to work with Vite dev server
    path: "/",
    sameSite: "lax",
    secure: false, // Set to false for development (localhost HTTP)
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return c.json({ 
    user: {
      id: (user as any).id,
      username: (user as any).username,
      name: (user as any).name,
      email: (user as any).email,
      role: (user as any).role,
      is_active: (user as any).is_active,
    },
    sessionToken: (user as any).id
  });
});

app.get("/api/auth/me", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME) || c.req.header("X-Session-Token");
  
  if (!sessionId) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const user = await c.env.DB.prepare(
    "SELECT id, username, name, email, role, is_active FROM users WHERE id = ? AND is_active = 1"
  ).bind(sessionId).first();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(user);
});

app.post("/api/auth/logout", async (c) => {
  deleteCookie(c, SESSION_COOKIE_NAME);
  return c.json({ success: true });
});

// Dashboard KPIs
app.get("/api/dashboard/kpis", authMiddleware, async (c) => {
  const today = new Date().toISOString().split('T')[0];
  
  const activeOps = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM production_orders WHERE is_completed = 0"
  ).first();

  const overdueOps = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM production_orders WHERE is_completed = 0 AND expected_date < ?"
  ).bind(today).first();

  const completedToday = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM production_orders WHERE is_completed = 1 AND DATE(updated_at) = ?"
  ).bind(today).first();

  const totalOps = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM production_orders"
  ).first();

  const productivity = totalOps && (totalOps as any).count > 0
    ? ((completedToday as any).count / (totalOps as any).count) * 100
    : 0;

  return c.json({
    active_ops: (activeOps as any).count || 0,
    overdue_ops: (overdueOps as any).count || 0,
    completed_today: (completedToday as any).count || 0,
    productivity_rate: Math.round(productivity),
  });
});

// Get next OP number
app.get("/api/production-orders/next-op-number", authMiddleware, async (c) => {
  const lastOP = await c.env.DB.prepare(
    "SELECT op_number FROM production_orders ORDER BY id DESC LIMIT 1"
  ).first();

  let nextOPNumber = "001";
  if (lastOP && (lastOP as any).op_number) {
    const lastNum = parseInt((lastOP as any).op_number);
    nextOPNumber = String(lastNum + 1).padStart(3, '0');
  }

  return c.json({ next_op_number: nextOPNumber });
});

// Create new user (Admin only)
app.post("/api/admin/users", authMiddleware, async (c) => {
  const currentUser = c.get("user") as any;
  
  if (currentUser.role !== "Admin") {
    return c.json({ error: "Apenas administradores podem criar usuários" }, 403);
  }

  const body = await c.req.json();
  const { username, password, name, email, role } = body;

  if (!username || !password || !name || !email || !role) {
    return c.json({ error: "Todos os campos são obrigatórios" }, 400);
  }

  // Check if username already exists
  const existing = await c.env.DB.prepare(
    "SELECT id FROM users WHERE username = ?"
  ).bind(username).first();

  if (existing) {
    return c.json({ error: "Nome de usuário já existe" }, 400);
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const userId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO users (id, mocha_user_id, username, password_hash, name, email, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
  ).bind(userId, `local-${userId}`, username, passwordHash, name, email, role).run();

  return c.json({ success: true, id: userId }, 201);
});

// Production Orders (now returns individual OPs)
app.get("/api/production-orders", authMiddleware, async (c) => {
  const status = c.req.query("status");
  const search = c.req.query("search");
  const requiresLab = c.req.query("requires_lab");

  let query = "SELECT * FROM production_orders WHERE 1=1";
  const params: any[] = [];

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }

  if (requiresLab === "true") {
    query += " AND requires_lab = 1";
  }

  if (search) {
    query += " AND (op_number LIKE ? OR client LIKE ? OR color LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += " ORDER BY created_at DESC";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

// Get individual OP details
app.get("/api/production-orders/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const op = await c.env.DB.prepare(
    "SELECT * FROM production_orders WHERE id = ?"
  ).bind(id).first();

  if (!op) {
    return c.json({ error: "Production order not found" }, 404);
  }

  // Get all OPs from the same sheet
  const items = await c.env.DB.prepare(
    "SELECT * FROM production_orders WHERE sheet_id = ? ORDER BY op_number"
  ).bind((op as any).sheet_id).all();

  const history = await c.env.DB.prepare(
    "SELECT * FROM activity_log WHERE op_id = ? ORDER BY created_at ASC"
  ).bind(id).all();

  return c.json({ 
    ...op, 
    items: items.results.map((item: any) => ({
      id: item.id,
      material: item.material,
      quantity: item.quantity,
      unit: item.unit,
      individual_op: item.op_number,
      requires_lab: item.requires_lab
    })),
    history: history.results 
  });
});

// Get production sheet by sheet number (for printing)
app.get("/api/production-sheets/:sheetNumber", authMiddleware, async (c) => {
  const sheetNumber = c.req.param("sheetNumber");
  
  const sheet = await c.env.DB.prepare(
    "SELECT * FROM production_sheets WHERE sheet_number = ?"
  ).bind(sheetNumber).first();

  if (!sheet) {
    return c.json({ error: "Production sheet not found" }, 404);
  }

  const ops = await c.env.DB.prepare(
    "SELECT * FROM production_orders WHERE sheet_id = ? ORDER BY op_number"
  ).bind((sheet as any).id).all();

  return c.json({ 
    ...sheet,
    op_number: (sheet as any).sheet_number,
    items: ops.results.map((op: any) => ({
      material: op.material,
      quantity: op.quantity,
      unit: op.unit,
      individual_op: op.op_number
    }))
  });
});

app.post("/api/production-orders", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = CreatePORequestSchema.parse(body);

  // Generate sheet number (for internal tracking)
  const lastSheet = await c.env.DB.prepare(
    "SELECT sheet_number FROM production_sheets ORDER BY id DESC LIMIT 1"
  ).first();

  let sheetNumber = "SHEET-001";
  if (lastSheet && (lastSheet as any).sheet_number) {
    const lastNum = parseInt((lastSheet as any).sheet_number.split('-')[1]);
    sheetNumber = `SHEET-${String(lastNum + 1).padStart(3, '0')}`;
  }

  const entryDate = validated.entry_date ? new Date(validated.entry_date) : new Date();
  const expectedDate = validated.expected_date ? new Date(validated.expected_date) : addBusinessDays(entryDate, 5);

  const userId = user.id;

  // Create production sheet
  const sheetResult = await c.env.DB.prepare(
    `INSERT INTO production_sheets 
    (sheet_number, client, color, order_number, description, entry_date, expected_date, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    sheetNumber,
    validated.client,
    validated.color,
    validated.order_number || null,
    validated.description || null,
    entryDate.toISOString(),
    expectedDate.toISOString(),
    userId
  ).run();

  const sheetId = sheetResult.meta.last_row_id;

  // Get the last OP number to generate sequential numbers
  const lastOP = await c.env.DB.prepare(
    "SELECT op_number FROM production_orders ORDER BY id DESC LIMIT 1"
  ).first();

  let currentOPNum = 1;
  if (lastOP && (lastOP as any).op_number) {
    currentOPNum = parseInt((lastOP as any).op_number) + 1;
  }

  // Create individual OPs
  const createdOps = [];
  for (let i = 0; i < validated.items.length; i++) {
    const item = validated.items[i];
    const opNumber = String(currentOPNum + i).padStart(3, '0');
    
    // Determine initial status: fabric quality items go to qualidade_malhas, others to preparacao
    const initialStatus = item.requires_fabric_quality ? "qualidade_malhas" : "preparacao";
    
    const opResult = await c.env.DB.prepare(
      `INSERT INTO production_orders 
      (sheet_id, op_number, client, color, order_number, entry_date, expected_date, material, quantity, unit, requires_lab, requires_fabric_quality, status, current_stage, responsible_user_id, description, region_jaragua, region_brusque, region_gaspar, fiber_id, is_dual_fiber, fiber2_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      sheetId,
      opNumber,
      validated.client,
      validated.color,
      validated.order_number || null,
      entryDate.toISOString(),
      expectedDate.toISOString(),
      item.material,
      item.quantity,
      item.unit,
      item.requires_lab ? 1 : 0,
      item.requires_fabric_quality ? 1 : 0,
      initialStatus,
      "almoxarifado",
      userId,
      validated.description || null,
      validated.region_jaragua ? 1 : 0,
      validated.region_brusque ? 1 : 0,
      validated.region_gaspar ? 1 : 0,
      validated.fiber_id || null,
      validated.is_dual_fiber ? 1 : 0,
      validated.fiber2_id || null
    ).run();

    const opId = opResult.meta.last_row_id;
    createdOps.push({ id: opId, op_number: opNumber });

    // Log activity
    await c.env.DB.prepare(
      "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      opId,
      "almoxarifado",
      "created",
      userId,
      `Criado por ${user.name}`
    ).run();
  }

  // Return the first OP number and id
  return c.json({ op_number: createdOps[0].op_number, id: createdOps[0].id, sheet_id: sheetId }, 201);
});

app.put("/api/production-orders/:id", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const id = c.req.param("id");
  const body = await c.req.json();
  const validated = CreatePORequestSchema.parse(body);

  const op = await c.env.DB.prepare(
    "SELECT * FROM production_orders WHERE id = ?"
  ).bind(id).first();

  if (!op) {
    return c.json({ error: "Production order not found" }, 404);
  }

  const sheetId = (op as any).sheet_id;

  const entryDate = validated.entry_date ? new Date(validated.entry_date) : new Date();
  const expectedDate = validated.expected_date ? new Date(validated.expected_date) : addBusinessDays(entryDate, 5);

  // Update production sheet
  await c.env.DB.prepare(
    `UPDATE production_sheets 
    SET client = ?, color = ?, order_number = ?, description = ?, entry_date = ?, expected_date = ?
    WHERE id = ?`
  ).bind(
    validated.client,
    validated.color,
    validated.order_number || null,
    validated.description || null,
    entryDate.toISOString(),
    expectedDate.toISOString(),
    sheetId
  ).run();

  // Get old OP numbers before deletion
  const { results: oldOPs } = await c.env.DB.prepare(
    "SELECT op_number FROM production_orders WHERE sheet_id = ? ORDER BY op_number"
  ).bind(sheetId).all();

  // Delete old OPs from this sheet
  await c.env.DB.prepare("DELETE FROM production_orders WHERE sheet_id = ?").bind(sheetId).run();

  // Create new OPs - reuse the old OP numbers if available
  const userId = user.id;

  const createdOps = [];
  for (let i = 0; i < validated.items.length; i++) {
    const item = validated.items[i];
    
    // Reuse old OP number if available, otherwise generate new sequential number
    let opNumber: string;
    if (i < oldOPs.length) {
      opNumber = (oldOPs[i] as any).op_number;
    } else {
      const lastOP = await c.env.DB.prepare(
        "SELECT op_number FROM production_orders ORDER BY id DESC LIMIT 1"
      ).first();
      
      let currentOPNum = 1;
      if (lastOP && (lastOP as any).op_number) {
        currentOPNum = parseInt((lastOP as any).op_number) + 1;
      }
      opNumber = String(currentOPNum).padStart(3, '0');
    }
    
    // Determine initial status: fabric quality items go to qualidade_malhas, others to preparacao
    const initialStatus = item.requires_fabric_quality ? "qualidade_malhas" : "preparacao";
    
    const opResult = await c.env.DB.prepare(
      `INSERT INTO production_orders 
      (sheet_id, op_number, client, color, order_number, entry_date, expected_date, material, quantity, unit, requires_lab, requires_fabric_quality, status, current_stage, responsible_user_id, description, region_jaragua, region_brusque, region_gaspar, fiber_id, is_dual_fiber, fiber2_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      sheetId,
      opNumber,
      validated.client,
      validated.color,
      validated.order_number || null,
      entryDate.toISOString(),
      expectedDate.toISOString(),
      item.material,
      item.quantity,
      item.unit,
      item.requires_lab ? 1 : 0,
      item.requires_fabric_quality ? 1 : 0,
      initialStatus,
      "almoxarifado",
      userId,
      validated.description || null,
      validated.region_jaragua ? 1 : 0,
      validated.region_brusque ? 1 : 0,
      validated.region_gaspar ? 1 : 0,
      validated.fiber_id || null,
      validated.is_dual_fiber ? 1 : 0,
      validated.fiber2_id || null
    ).run();

    const opId = opResult.meta.last_row_id;
    createdOps.push({ id: opId, op_number: opNumber });

    await c.env.DB.prepare(
      "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      opId,
      "almoxarifado",
      "updated",
      userId,
      `Atualizado por ${user.name}`
    ).run();
  }

  return c.json({ success: true });
});

app.delete("/api/production-orders/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");

  const op = await c.env.DB.prepare(
    "SELECT * FROM production_orders WHERE id = ?"
  ).bind(id).first();

  if (!op) {
    return c.json({ error: "Production order not found" }, 404);
  }

  const sheetId = (op as any).sheet_id;

  // Delete all OPs from this sheet
  const { results: opsToDelete } = await c.env.DB.prepare(
    "SELECT id FROM production_orders WHERE sheet_id = ?"
  ).bind(sheetId).all();

  for (const opToDelete of opsToDelete) {
    const opId = (opToDelete as any).id;
    await c.env.DB.prepare("DELETE FROM po_preparation WHERE op_id = ?").bind(opId).run();
    await c.env.DB.prepare("DELETE FROM po_production WHERE op_id = ?").bind(opId).run();
    await c.env.DB.prepare("DELETE FROM po_dryer WHERE op_id = ?").bind(opId).run();
    await c.env.DB.prepare("DELETE FROM po_untangling WHERE op_id = ?").bind(opId).run();
    await c.env.DB.prepare("DELETE FROM po_rolling WHERE op_id = ?").bind(opId).run();
    await c.env.DB.prepare("DELETE FROM po_quality WHERE op_id = ?").bind(opId).run();
    await c.env.DB.prepare("DELETE FROM po_laboratory WHERE op_id = ?").bind(opId).run();
    await c.env.DB.prepare("DELETE FROM activity_log WHERE op_id = ?").bind(opId).run();
    await c.env.DB.prepare("DELETE FROM po_in_progress WHERE op_id = ?").bind(opId).run();
  }

  await c.env.DB.prepare("DELETE FROM production_orders WHERE sheet_id = ?").bind(sheetId).run();
  await c.env.DB.prepare("DELETE FROM production_sheets WHERE id = ?").bind(sheetId).run();

  return c.json({ success: true });
});

// Start/Stop OP in progress (now uses op_id)
app.post("/api/op-start", authMiddleware, async (c) => {
  const body = await c.req.json();
  const { op_id, stage, box_number, machine } = body;

  if (!op_id || !stage) {
    return c.json({ error: "Missing op_id or stage" }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT * FROM po_in_progress WHERE op_id = ? AND stage = ?"
  ).bind(op_id, stage).first();

  if (existing) {
    return c.json({ error: "OP already in progress" }, 400);
  }

  await c.env.DB.prepare(
    "INSERT INTO po_in_progress (op_id, stage, box_number, machine) VALUES (?, ?, ?, ?)"
  ).bind(op_id, stage, box_number || null, machine || null).run();

  return c.json({ success: true, started_at: new Date().toISOString() });
});

app.post("/api/op-stop", authMiddleware, async (c) => {
  const body = await c.req.json();
  const { op_id, stage } = body;

  if (!op_id || !stage) {
    return c.json({ error: "Missing op_id or stage" }, 400);
  }

  const inProgress = await c.env.DB.prepare(
    "SELECT * FROM po_in_progress WHERE op_id = ? AND stage = ?"
  ).bind(op_id, stage).first();

  if (!inProgress) {
    return c.json({ error: "OP not in progress" }, 400);
  }

  await c.env.DB.prepare(
    "DELETE FROM po_in_progress WHERE op_id = ? AND stage = ?"
  ).bind(op_id, stage).run();

  return c.json({ 
    success: true, 
    started_at: (inProgress as any).started_at,
    stopped_at: new Date().toISOString(),
    box_number: (inProgress as any).box_number,
    machine: (inProgress as any).machine
  });
});

app.get("/api/op-status/:id/:stage", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const stage = c.req.param("stage");

  const inProgress = await c.env.DB.prepare(
    "SELECT * FROM po_in_progress WHERE op_id = ? AND stage = ?"
  ).bind(id, stage).first();

  return c.json({ 
    in_progress: !!inProgress,
    started_at: inProgress ? (inProgress as any).started_at : null,
    box_number: inProgress ? (inProgress as any).box_number : null,
    machine: inProgress ? (inProgress as any).machine : null
  });
});

// All stage endpoints now use op_id instead of po_id
app.post("/api/preparation", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = PreparationRequestSchema.parse(body);

  const userId = user.id;

  await c.env.DB.prepare(
    `INSERT INTO po_preparation (op_id, employee_ids, start_time, end_time, splices, total_weight, destination_box)
    VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    validated.po_id, // Still named po_id in schema but refers to op_id
    JSON.stringify(validated.employee_meters),
    validated.start_time,
    validated.end_time,
    JSON.stringify(validated.splices),
    validated.total_weight,
    validated.destination_box
  ).run();

  // Check destination: Box 4 -> box4, Box 5 -> box5, Box 6 -> box6, others (Box 1,2,3) -> producao
  let nextStatus = "producao";
  if (validated.destination_box === "Box 4") {
    nextStatus = "box4";
  } else if (validated.destination_box === "Box 5") {
    nextStatus = "box5";
  } else if (validated.destination_box === "Box 6") {
    nextStatus = "box6";
  }

  await c.env.DB.prepare(
    "UPDATE production_orders SET status = ?, current_stage = ? WHERE id = ?"
  ).bind(nextStatus, "preparacao", validated.po_id).run();

  await c.env.DB.prepare(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES (?, ?, ?, ?)"
  ).bind(validated.po_id, "preparacao", "completed", userId).run();

  return c.json({ success: true });
});

// Batch preparation endpoint
app.post("/api/preparation/batch", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = BatchPreparationRequestSchema.parse(body);

  const userId = user.id;

  // Generate batch number
  const lastBatch = await c.env.DB.prepare(
    "SELECT batch_number FROM preparation_batches ORDER BY id DESC LIMIT 1"
  ).first();

  let batchNumber = "LOTE-001";
  if (lastBatch && (lastBatch as any).batch_number) {
    const lastNum = parseInt((lastBatch as any).batch_number.split('-')[1]);
    batchNumber = `LOTE-${String(lastNum + 1).padStart(3, '0')}`;
  }

  // Create batch record
  const batchResult = await c.env.DB.prepare(
    `INSERT INTO preparation_batches (batch_number, color, total_weight, destination_box, employee_ids, splices, start_time, end_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    batchNumber,
    validated.color,
    validated.total_weight,
    validated.destination_box,
    JSON.stringify(validated.employee_meters),
    JSON.stringify(validated.splices),
    validated.start_time,
    validated.end_time
  ).run();

  const batchId = batchResult.meta.last_row_id;

  // Link OPs to batch
  for (const op of validated.ops) {
    await c.env.DB.prepare(
      "INSERT INTO batch_ops (batch_id, op_id, meters_in_batch) VALUES (?, ?, ?)"
    ).bind(batchId, op.op_id, op.meters).run();

    // Create individual preparation record for each OP
    await c.env.DB.prepare(
      `INSERT INTO po_preparation (op_id, employee_ids, start_time, end_time, splices, total_weight, destination_box)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      op.op_id,
      JSON.stringify(validated.employee_meters),
      validated.start_time,
      validated.end_time,
      JSON.stringify(validated.splices),
      op.meters, // Weight proportional to meters
      validated.destination_box
    ).run();

    // Check destination: Box 4 -> box4, Box 5 -> box5, Box 6 -> box6, others (Box 1,2,3) -> producao
    let nextStatus = "producao";
    if (validated.destination_box === "Box 4") {
      nextStatus = "box4";
    } else if (validated.destination_box === "Box 5") {
      nextStatus = "box5";
    } else if (validated.destination_box === "Box 6") {
      nextStatus = "box6";
    }

    await c.env.DB.prepare(
      "UPDATE production_orders SET status = ?, current_stage = ? WHERE id = ?"
    ).bind(nextStatus, "preparacao", op.op_id).run();

    await c.env.DB.prepare(
      "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES (?, ?, ?, ?, ?)"
    ).bind(op.op_id, "preparacao", "completed_in_batch", userId, `Lote ${batchNumber}`).run();
  }

  return c.json({ success: true, batch_number: batchNumber });
});

// Get OPs available for batch grouping (same color, in preparacao status)
app.get("/api/preparation/available-for-batch", authMiddleware, async (c) => {
  const color = c.req.query("color");
  
  if (!color) {
    return c.json({ error: "Color parameter required" }, 400);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM production_orders 
    WHERE color = ? AND status = 'preparacao'
    ORDER BY entry_date ASC`
  ).bind(color).all();

  return c.json(results);
});

// Create lot OPs from a parent OP
app.post("/api/preparation/create-lots", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const { parent_op_id, num_lots, lot_meters } = body;

  if (!parent_op_id || !num_lots || !lot_meters || lot_meters.length !== num_lots) {
    return c.json({ error: "Invalid parameters" }, 400);
  }

  const userId = user.id;

  // Get parent OP
  const parentOP = await c.env.DB.prepare(
    "SELECT * FROM production_orders WHERE id = ?"
  ).bind(parent_op_id).first();

  if (!parentOP) {
    return c.json({ error: "Parent OP not found" }, 404);
  }

  const parent = parentOP as any;

  // Create lot OPs
  const createdLots = [];
  for (let i = 0; i < num_lots; i++) {
    const lotNumber = i + 1;
    const meters = lot_meters[i];
    // Use parent OP number with lot suffix
    const newOPNumber = `${parent.op_number}-L${lotNumber}`;

    const result = await c.env.DB.prepare(
      `INSERT INTO production_orders 
      (sheet_id, op_number, client, color, order_number, entry_date, expected_date, 
       material, quantity, unit, requires_lab, status, current_stage, responsible_user_id, 
       description, lot_number, parent_op_id, lot_meters)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      parent.sheet_id,
      newOPNumber,
      parent.client,
      parent.color,
      parent.order_number,
      parent.entry_date,
      parent.expected_date,
      parent.material,
      meters,
      parent.unit,
      parent.requires_lab,
      "preparacao",
      "preparacao",
      userId,
      parent.description,
      lotNumber,
      parent_op_id,
      meters
    ).run();

    const lotOpId = result.meta.last_row_id;
    createdLots.push({ id: lotOpId, op_number: newOPNumber, lot_number: lotNumber });

    await c.env.DB.prepare(
      "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      lotOpId,
      "preparacao",
      "lot_created",
      userId,
      `Lote ${lotNumber} de ${num_lots} criado a partir da OP ${parent.op_number}`
    ).run();
  }

  // Mark parent OP as completed (it's been split into lots)
  await c.env.DB.prepare(
    "UPDATE production_orders SET status = 'concluido', is_completed = 1 WHERE id = ?"
  ).bind(parent_op_id).run();

  await c.env.DB.prepare(
    "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES (?, ?, ?, ?, ?)"
  ).bind(
    parent_op_id,
    "preparacao",
    "split_into_lots",
    userId,
    `Dividida em ${num_lots} lotes`
  ).run();

  return c.json({ success: true, lots: createdLots });
});

app.post("/api/production", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = ProductionRequestSchema.parse(body);

  const userId = user.id;

  await c.env.DB.prepare(
    `INSERT INTO po_production (op_id, box_number, machine, operator, has_adjustment, start_date, end_date, meters_produced)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    validated.po_id,
    validated.box_number,
    validated.machine,
    validated.operator,
    validated.has_adjustment ? 1 : 0,
    validated.start_date,
    validated.end_date,
    validated.meters_produced
  ).run();

  await c.env.DB.prepare(
    "UPDATE production_orders SET status = ?, current_stage = ? WHERE id = ?"
  ).bind("secadora", "producao", validated.po_id).run();

  await c.env.DB.prepare(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES (?, ?, ?, ?)"
  ).bind(validated.po_id, "producao", "completed", userId).run();

  return c.json({ success: true });
});

app.post("/api/dryer", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = DryerRequestSchema.parse(body);

  const userId = user.id;

  await c.env.DB.prepare(
    "INSERT INTO po_dryer (op_id, destination) VALUES (?, ?)"
  ).bind(validated.po_id, validated.destination).run();

  await c.env.DB.prepare(
    "UPDATE production_orders SET status = ?, current_stage = ? WHERE id = ?"
  ).bind(validated.destination, "secadora", validated.po_id).run();

  await c.env.DB.prepare(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES (?, ?, ?, ?)"
  ).bind(validated.po_id, "secadora", "completed", userId).run();

  return c.json({ success: true });
});

app.post("/api/untangling", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = UntanglingRequestSchema.parse(body);

  const userId = user.id;

  await c.env.DB.prepare(
    `INSERT INTO po_untangling (op_id, num_employees, meters_per_employee, employee_times, start_time, end_time)
    VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    validated.po_id,
    validated.num_employees,
    validated.meters_per_employee,
    JSON.stringify(validated.employee_times),
    validated.start_time,
    validated.end_time
  ).run();

  await c.env.DB.prepare(
    "UPDATE production_orders SET status = ?, current_stage = ? WHERE id = ?"
  ).bind("enrolagem", "destrinchagem", validated.po_id).run();

  await c.env.DB.prepare(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES (?, ?, ?, ?)"
  ).bind(validated.po_id, "destrinchagem", "completed", userId).run();

  return c.json({ success: true });
});

app.post("/api/rolling", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = RollingRequestSchema.parse(body);

  const userId = user.id;

  await c.env.DB.prepare(
    `INSERT INTO po_rolling (op_id, employee_ids, num_splices, num_rolls, issue_description, start_time, end_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    validated.po_id,
    JSON.stringify(validated.employee_ids),
    validated.num_splices,
    validated.num_rolls,
    validated.issue_description || null,
    validated.start_time,
    validated.end_time
  ).run();

  await c.env.DB.prepare(
    "UPDATE production_orders SET status = ?, current_stage = ? WHERE id = ?"
  ).bind("qualidade", "enrolagem", validated.po_id).run();

  await c.env.DB.prepare(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES (?, ?, ?, ?)"
  ).bind(validated.po_id, "enrolagem", "completed", userId).run();

  return c.json({ success: true });
});

app.post("/api/quality", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = QualityRequestSchema.parse(body);

  const userId = user.id;

  await c.env.DB.prepare(
    `INSERT INTO po_quality (op_id, rolls_sent, meters_per_roll, discrepancy)
    VALUES (?, ?, ?, ?)`
  ).bind(
    validated.po_id,
    validated.rolls_sent,
    validated.meters_per_roll,
    validated.discrepancy || null
  ).run();

  await c.env.DB.prepare(
    "UPDATE production_orders SET status = ?, current_stage = ?, is_completed = 1 WHERE id = ?"
  ).bind("concluido", "qualidade", validated.po_id).run();

  await c.env.DB.prepare(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES (?, ?, ?, ?)"
  ).bind(validated.po_id, "qualidade", "completed", userId).run();

  return c.json({ success: true });
});

app.post("/api/laboratory", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = LaboratoryRequestSchema.parse(body);

  const userId = user.id;

  await c.env.DB.prepare(
    `INSERT INTO po_laboratory (op_id, num_batches, is_recipe_ready, recipe_origin_date, description, is_approved, start_time, end_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    validated.po_id,
    validated.num_batches || null,
    validated.is_recipe_ready ? 1 : 0,
    validated.recipe_origin_date || null,
    validated.description || null,
    validated.is_approved ? 1 : 0,
    validated.start_time,
    validated.end_time
  ).run();

  // Lab processing doesn't change the status - it's just for tracking
  await c.env.DB.prepare(
    "INSERT INTO activity_log (op_id, stage, action, user_id) VALUES (?, ?, ?, ?)"
  ).bind(validated.po_id, "laboratorio", validated.is_approved ? "approved" : "processed", userId).run();

  return c.json({ success: true });
});

// Box 5 endpoint
app.post("/api/box5", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = Box5RequestSchema.parse(body);

  const userId = user.id;

  await c.env.DB.prepare(
    `INSERT INTO po_box5 (po_id, employee_id, has_adjustment, adjustment_details, is_reprocess, reprocess_reason, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    validated.po_id,
    validated.employee_id,
    validated.has_adjustment ? 1 : 0,
    validated.adjustment_details || null,
    validated.is_reprocess ? 1 : 0,
    validated.reprocess_reason || null,
    validated.timestamp
  ).run();

  await c.env.DB.prepare(
    "UPDATE production_orders SET status = ?, current_stage = ? WHERE id = ?"
  ).bind("producao", "box5", validated.po_id).run();

  await c.env.DB.prepare(
    "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES (?, ?, ?, ?, ?)"
  ).bind(
    validated.po_id, 
    "box5", 
    "processed", 
    userId,
    `Processado por ${validated.employee_id}${validated.has_adjustment ? ' - Com ajuste' : ''}${validated.is_reprocess ? ' - Reprocesso' : ''}`
  ).run();

  return c.json({ success: true });
});

// Box 4 endpoint
app.post("/api/box4", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = Box4RequestSchema.parse(body);

  const userId = user.id;

  await c.env.DB.prepare(
    `INSERT INTO po_box4 (po_id, employee_id, has_adjustment, adjustment_details, is_reprocess, reprocess_reason, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    validated.po_id,
    validated.employee_id,
    validated.has_adjustment ? 1 : 0,
    validated.adjustment_details || null,
    validated.is_reprocess ? 1 : 0,
    validated.reprocess_reason || null,
    validated.timestamp
  ).run();

  await c.env.DB.prepare(
    "UPDATE production_orders SET status = ?, current_stage = ? WHERE id = ?"
  ).bind("producao", "box4", validated.po_id).run();

  await c.env.DB.prepare(
    "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES (?, ?, ?, ?, ?)"
  ).bind(
    validated.po_id, 
    "box4", 
    "processed", 
    userId,
    `Processado por ${validated.employee_id}${validated.has_adjustment ? ' - Com ajuste' : ''}${validated.is_reprocess ? ' - Reprocesso' : ''}`
  ).run();

  return c.json({ success: true });
});

// Get Box 4 records
app.get("/api/box4/records", authMiddleware, async (c) => {
  const waiting = await c.env.DB.prepare(
    "SELECT * FROM production_orders WHERE status = 'box4' ORDER BY created_at ASC"
  ).all();
  
  const inProgressData: any[] = [];
  for (const op of waiting.results) {
    const status = await c.env.DB.prepare(
      "SELECT * FROM po_in_progress WHERE op_id = ? AND stage = 'box4'"
    ).bind((op as any).id).first();
    
    if (status) {
      inProgressData.push(op);
    }
  }
  
  const waitingData = waiting.results.filter((op: any) => 
    !inProgressData.find(ip => ip.id === op.id)
  );
  
  const allOPs = await c.env.DB.prepare(
    "SELECT * FROM production_orders ORDER BY created_at DESC"
  ).all();
  
  const completed = allOPs.results.filter((op: any) => {
    if (op.status !== "producao" || op.current_stage !== "box4") return false;
    const updatedAt = new Date(op.updated_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  });
  
  return c.json({
    waiting: waitingData,
    inProgress: inProgressData,
    completed: completed
  });
});

// Get Box 5 records
app.get("/api/box5/records", authMiddleware, async (c) => {
  const waiting = await c.env.DB.prepare(
    "SELECT * FROM production_orders WHERE status = 'box5' ORDER BY created_at ASC"
  ).all();
  
  const inProgressData: any[] = [];
  for (const op of waiting.results) {
    const status = await c.env.DB.prepare(
      "SELECT * FROM po_in_progress WHERE op_id = ? AND stage = 'box5'"
    ).bind((op as any).id).first();
    
    if (status) {
      inProgressData.push(op);
    }
  }
  
  const waitingData = waiting.results.filter((op: any) => 
    !inProgressData.find(ip => ip.id === op.id)
  );
  
  const allOPs = await c.env.DB.prepare(
    "SELECT * FROM production_orders ORDER BY created_at DESC"
  ).all();
  
  const completed = allOPs.results.filter((op: any) => {
    if (op.status !== "producao" || op.current_stage !== "box5") return false;
    const updatedAt = new Date(op.updated_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  });
  
  return c.json({
    waiting: waitingData,
    inProgress: inProgressData,
    completed: completed
  });
});

// Box 6 endpoint
app.post("/api/box6", authMiddleware, async (c) => {
  const user = c.get("user") as any;
  const body = await c.req.json();
  const validated = Box6RequestSchema.parse(body);

  const userId = user.id;

  await c.env.DB.prepare(
    `INSERT INTO po_box6 (po_id, employee_id, has_adjustment, adjustment_details, is_reprocess, reprocess_reason, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    validated.po_id,
    validated.employee_id,
    validated.has_adjustment ? 1 : 0,
    validated.adjustment_details || null,
    validated.is_reprocess ? 1 : 0,
    validated.reprocess_reason || null,
    validated.timestamp
  ).run();

  await c.env.DB.prepare(
    "UPDATE production_orders SET status = ?, current_stage = ? WHERE id = ?"
  ).bind("producao", "box6", validated.po_id).run();

  await c.env.DB.prepare(
    "INSERT INTO activity_log (op_id, stage, action, user_id, details) VALUES (?, ?, ?, ?, ?)"
  ).bind(
    validated.po_id, 
    "box6", 
    "processed", 
    userId,
    `Processado por ${validated.employee_id}${validated.has_adjustment ? ' - Com ajuste' : ''}${validated.is_reprocess ? ' - Reprocesso' : ''}`
  ).run();

  return c.json({ success: true });
});

// Get Box 6 records
app.get("/api/box6/records", authMiddleware, async (c) => {
  const waiting = await c.env.DB.prepare(
    "SELECT * FROM production_orders WHERE status = 'box6' ORDER BY created_at ASC"
  ).all();
  
  const inProgressData: any[] = [];
  for (const op of waiting.results) {
    const status = await c.env.DB.prepare(
      "SELECT * FROM po_in_progress WHERE op_id = ? AND stage = 'box6'"
    ).bind((op as any).id).first();
    
    if (status) {
      inProgressData.push(op);
    }
  }
  
  const waitingData = waiting.results.filter((op: any) => 
    !inProgressData.find(ip => ip.id === op.id)
  );
  
  const allOPs = await c.env.DB.prepare(
    "SELECT * FROM production_orders ORDER BY created_at DESC"
  ).all();
  
  const completed = allOPs.results.filter((op: any) => {
    if (op.status !== "producao" || op.current_stage !== "box6") return false;
    const updatedAt = new Date(op.updated_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  });
  
  return c.json({
    waiting: waitingData,
    inProgress: inProgressData,
    completed: completed
  });
});

// PCP endpoints
app.put("/api/pcp/priority/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { priority, priority_notes } = body;

  await c.env.DB.prepare(
    "UPDATE production_orders SET priority = ?, priority_notes = ? WHERE id = ?"
  ).bind(priority, priority_notes || null, id).run();

  return c.json({ success: true });
});

app.put("/api/pcp/sequence/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { sequence_order } = body;

  await c.env.DB.prepare(
    "UPDATE production_orders SET sequence_order = ? WHERE id = ?"
  ).bind(sequence_order, id).run();

  return c.json({ success: true });
});

app.get("/api/pcp/capacity-analysis", authMiddleware, async (c) => {
  const stages = ['preparacao', 'producao', 'secadora', 'destrinchagem', 'enrolagem', 'qualidade'];
  const capacity: any = {};

  for (const stage of stages) {
    const count = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM production_orders WHERE status = ? AND is_completed = 0"
    ).bind(stage).first();
    
    const urgent = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM production_orders WHERE status = ? AND is_completed = 0 AND priority >= 3"
    ).bind(stage).first();

    capacity[stage] = {
      total: (count as any).count || 0,
      urgent: (urgent as any).count || 0,
    };
  }

  return c.json(capacity);
});

app.get("/api/pcp/overdue-ops", authMiddleware, async (c) => {
  const today = new Date().toISOString().split('T')[0];
  
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM production_orders 
    WHERE is_completed = 0 AND expected_date < ?
    ORDER BY expected_date ASC`
  ).bind(today).all();

  return c.json(results);
});

app.get("/api/pcp/priority-ops", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM production_orders 
    WHERE is_completed = 0 AND priority > 0
    ORDER BY priority DESC, expected_date ASC`
  ).all();

  return c.json(results);
});

// Delete laboratory record (return OP to lab)
app.delete("/api/laboratory/:id", authMiddleware, async (c) => {
  const labRecordId = c.req.param("id");
  
  await c.env.DB.prepare(
    "DELETE FROM po_laboratory WHERE id = ?"
  ).bind(labRecordId).run();
  
  return c.json({ success: true });
});

// Get laboratory records - all OPs with requires_lab = 1, excluding lots
app.get("/api/laboratory/records", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT 
      po.*,
      lab.id as lab_record_id,
      lab.num_batches,
      lab.is_recipe_ready,
      lab.recipe_origin_date,
      lab.description as lab_description,
      lab.is_approved,
      lab.start_time as lab_start_time,
      lab.end_time as lab_end_time,
      lab.created_at as lab_processed_at
    FROM production_orders po
    LEFT JOIN po_laboratory lab ON po.id = lab.op_id
    WHERE po.requires_lab = 1 AND po.lot_number IS NULL AND po.parent_op_id IS NULL
    ORDER BY po.created_at DESC`
  ).all();
  
  // Convert SQLite date format to ISO 8601 for proper parsing in frontend
  const formattedResults = results.map((record: any) => ({
    ...record,
    created_at: record.created_at ? new Date(record.created_at.replace(' ', 'T') + 'Z').toISOString() : null,
    updated_at: record.updated_at ? new Date(record.updated_at.replace(' ', 'T') + 'Z').toISOString() : null,
    entry_date: record.entry_date,
    expected_date: record.expected_date,
    lab_start_time: record.lab_start_time,
    lab_end_time: record.lab_end_time,
    lab_processed_at: record.lab_processed_at ? new Date(record.lab_processed_at.replace(' ', 'T') + 'Z').toISOString() : null,
  }));
  
  return c.json(formattedResults);
});

// Admin - User management
app.get("/api/admin/users", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM users ORDER BY created_at DESC"
  ).all();
  return c.json(results);
});

app.put("/api/admin/users/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  await c.env.DB.prepare(
    "UPDATE users SET role = ?, is_active = ? WHERE id = ?"
  ).bind(body.role, body.is_active ? 1 : 0, id).run();

  return c.json({ success: true });
});

// Employee management endpoints
app.get("/api/employees", authMiddleware, async (c) => {
  const sector = c.req.query("sector");
  
  let query = "SELECT * FROM employees WHERE is_active = 1";
  const params: any[] = [];

  if (sector && sector !== "Todos") {
    query += " AND (sector = ? OR sector = 'Todos')";
    params.push(sector);
  }

  query += " ORDER BY sector, name";

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

app.post("/api/employees", authMiddleware, async (c) => {
  const body = await c.req.json();
  const validated = CreateEmployeeRequestSchema.parse(body);

  await c.env.DB.prepare(
    "INSERT INTO employees (name, sector, is_active) VALUES (?, ?, 1)"
  ).bind(validated.name, validated.sector).run();

  return c.json({ success: true }, 201);
});

app.put("/api/employees/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  await c.env.DB.prepare(
    "UPDATE employees SET name = ?, sector = ?, is_active = ? WHERE id = ?"
  ).bind(body.name, body.sector, body.is_active ? 1 : 0, id).run();

  return c.json({ success: true });
});

app.delete("/api/employees/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");

  await c.env.DB.prepare(
    "DELETE FROM employees WHERE id = ?"
  ).bind(id).run();

  return c.json({ success: true });
});

// Fabric Quality Inspection endpoints
app.get("/api/fabric-quality/inspections", authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM fabric_quality_inspections ORDER BY inspection_date DESC"
  ).all();
  
  return c.json(results);
});

app.get("/api/fabric-quality/inspections/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  
  const inspection = await c.env.DB.prepare(
    "SELECT * FROM fabric_quality_inspections WHERE id = ?"
  ).bind(id).first();
  
  if (!inspection) {
    return c.json({ error: "Inspection not found" }, 404);
  }
  
  return c.json(inspection);
});

app.post("/api/fabric-quality/inspections", authMiddleware, async (c) => {
  const body = await c.req.json();
  const validated = FabricQualityInspectionSchema.parse(body);

  // Generate inspection number
  const lastInspection = await c.env.DB.prepare(
    "SELECT inspection_number FROM fabric_quality_inspections ORDER BY id DESC LIMIT 1"
  ).first();

  let inspectionNumber = "INS-001";
  if (lastInspection && (lastInspection as any).inspection_number) {
    const lastNum = parseInt((lastInspection as any).inspection_number.split('-')[1]);
    inspectionNumber = `INS-${String(lastNum + 1).padStart(3, '0')}`;
  }

  await c.env.DB.prepare(
    `INSERT INTO fabric_quality_inspections 
    (inspection_number, item_description, weight, destination_sector, observations, defect_image_url, employee_name, inspection_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    inspectionNumber,
    validated.item_description,
    validated.weight,
    validated.destination_sector,
    validated.observations || null,
    validated.defect_image_url || null,
    validated.employee_name,
    validated.inspection_date
  ).run();

  return c.json({ success: true, inspection_number: inspectionNumber }, 201);
});

app.put("/api/fabric-quality/inspections/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const validated = FabricQualityInspectionSchema.parse(body);

  await c.env.DB.prepare(
    `UPDATE fabric_quality_inspections 
    SET item_description = ?, weight = ?, destination_sector = ?, observations = ?, 
        defect_image_url = ?, employee_name = ?, inspection_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`
  ).bind(
    validated.item_description,
    validated.weight,
    validated.destination_sector,
    validated.observations || null,
    validated.defect_image_url || null,
    validated.employee_name,
    validated.inspection_date,
    id
  ).run();

  return c.json({ success: true });
});

app.delete("/api/fabric-quality/inspections/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");

  await c.env.DB.prepare(
    "DELETE FROM fabric_quality_inspections WHERE id = ?"
  ).bind(id).run();

  return c.json({ success: true });
});

// Pesagem (Weighing) endpoints
// Get OPs for pesagem kanban - OPs that lab finalized (have lab_record)
app.get("/api/pesagem/records", authMiddleware, async (c) => {
  // Waiting: OPs with lab finalized but no pesagem record
  const { results: waitingResults } = await c.env.DB.prepare(
    `SELECT po.*, lab.id as lab_record_id
    FROM production_orders po
    INNER JOIN po_laboratory lab ON po.id = lab.op_id
    LEFT JOIN po_pesagem pes ON po.id = pes.op_id
    WHERE po.requires_lab = 1 
      AND po.lot_number IS NULL 
      AND po.parent_op_id IS NULL
      AND po.recipe_weighed = 0
      AND pes.id IS NULL
    ORDER BY po.created_at DESC`
  ).all();

  // In Progress: OPs with pesagem started but not finished
  const { results: inProgressResults } = await c.env.DB.prepare(
    `SELECT po.*, pes.id as pesagem_id, pes.start_time as pesagem_start_time, pes.end_time as pesagem_end_time
    FROM production_orders po
    INNER JOIN po_pesagem pes ON po.id = pes.op_id
    WHERE po.requires_lab = 1 
      AND po.lot_number IS NULL 
      AND po.parent_op_id IS NULL
      AND pes.start_time IS NOT NULL
      AND pes.end_time IS NULL
    ORDER BY pes.start_time DESC`
  ).all();

  // Completed: OPs with pesagem finished (last 50)
  const { results: completedResults } = await c.env.DB.prepare(
    `SELECT po.*, pes.id as pesagem_id, pes.start_time as pesagem_start_time, pes.end_time as pesagem_end_time
    FROM production_orders po
    INNER JOIN po_pesagem pes ON po.id = pes.op_id
    WHERE po.requires_lab = 1 
      AND po.lot_number IS NULL 
      AND po.parent_op_id IS NULL
      AND pes.end_time IS NOT NULL
    ORDER BY pes.end_time DESC
    LIMIT 50`
  ).all();

  return c.json({
    waiting: waitingResults,
    inProgress: inProgressResults,
    completed: completedResults,
  });
});

// Start pesagem
app.post("/api/pesagem/start", authMiddleware, async (c) => {
  const body = await c.req.json();
  const { op_id } = body;

  if (!op_id) {
    return c.json({ error: "op_id is required" }, 400);
  }

  // Mark recipe as approved when starting pesagem
  await c.env.DB.prepare(
    "UPDATE production_orders SET recipe_approved = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(op_id).run();

  // Create pesagem record with start time
  await c.env.DB.prepare(
    "INSERT INTO po_pesagem (op_id, start_time) VALUES (?, CURRENT_TIMESTAMP)"
  ).bind(op_id).run();

  return c.json({ success: true }, 201);
});

// Finish pesagem
app.post("/api/pesagem/finish", authMiddleware, async (c) => {
  const body = await c.req.json();
  const { op_id, employee_id, notes } = body;

  if (!op_id || !employee_id) {
    return c.json({ error: "op_id and employee_id are required" }, 400);
  }

  // Update pesagem record with end time and employee
  await c.env.DB.prepare(
    `UPDATE po_pesagem 
    SET end_time = CURRENT_TIMESTAMP, employee_id = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE op_id = ? AND end_time IS NULL`
  ).bind(employee_id, notes || null, op_id).run();

  // Mark recipe as weighed
  await c.env.DB.prepare(
    "UPDATE production_orders SET recipe_weighed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(op_id).run();

  return c.json({ success: true });
});

// =====================
// TRANSPORTADORAS API
// =====================

app.get("/api/transportadoras", authMiddleware, async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT * FROM transportadoras ORDER BY name ASC"
  ).all();
  return c.json(result.results);
});

app.post("/api/transportadoras", authMiddleware, async (c) => {
  const body = await c.req.json();
  const { name } = body;

  if (!name) {
    return c.json({ error: "Nome é obrigatório" }, 400);
  }

  await c.env.DB.prepare(
    "INSERT INTO transportadoras (name) VALUES (?)"
  ).bind(name).run();

  return c.json({ success: true }, 201);
});

app.put("/api/transportadoras/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, is_active } = body;

  await c.env.DB.prepare(
    "UPDATE transportadoras SET name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(name, is_active ? 1 : 0, id).run();

  return c.json({ success: true });
});

app.delete("/api/transportadoras/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM transportadoras WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// =====================
// REGIOES ENTREGA API
// =====================

app.get("/api/regioes", authMiddleware, async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT * FROM regioes_entrega ORDER BY name ASC"
  ).all();
  return c.json(result.results);
});

app.post("/api/regioes", authMiddleware, async (c) => {
  const body = await c.req.json();
  const { name } = body;

  if (!name) {
    return c.json({ error: "Nome é obrigatório" }, 400);
  }

  await c.env.DB.prepare(
    "INSERT INTO regioes_entrega (name) VALUES (?)"
  ).bind(name).run();

  return c.json({ success: true }, 201);
});

app.put("/api/regioes/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, is_active } = body;

  await c.env.DB.prepare(
    "UPDATE regioes_entrega SET name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(name, is_active ? 1 : 0, id).run();

  return c.json({ success: true });
});

app.delete("/api/regioes/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare(" DELETE FROM regioes_entrega WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// =====================
// FIBRAS API
// =====================

app.get("/api/fibras", authMiddleware, async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT * FROM fibras ORDER BY name ASC"
  ).all();
  return c.json(result.results);
});

app.post("/api/fibras", authMiddleware, async (c) => {
  const body = await c.req.json();
  const { name } = body;

  if (!name) {
    return c.json({ error: "Nome é obrigatório" }, 400);
  }

  await c.env.DB.prepare(
    "INSERT INTO fibras (name) VALUES (?)"
  ).bind(name).run();

  return c.json({ success: true }, 201);
});

app.put("/api/fibras/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, is_active } = body;

  await c.env.DB.prepare(
    "UPDATE fibras SET name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(name, is_active ? 1 : 0, id).run();

  return c.json({ success: true });
});

app.delete("/api/fibras/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM fibras WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// Lista de Saída endpoints
app.get("/api/lista-saida", authMiddleware, async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT ls.*, po.op_number, po.client, po.color, po.material, po.quantity, po.unit,
           t.name as transportadora_name, r.name as regiao_name
    FROM lista_saida ls
    JOIN production_orders po ON ls.op_id = po.id
    LEFT JOIN transportadoras t ON ls.transportadora_id = t.id
    LEFT JOIN regioes_entrega r ON ls.regiao_id = r.id
    ORDER BY ls.exit_date ASC
  `).all();
  return c.json(result.results);
});

app.post("/api/lista-saida", authMiddleware, async (c) => {
  const body = await c.req.json();
  const { op_id, exit_date, exit_time, transportadora_id, regiao_id } = body;
  
  if (!op_id || !exit_date) {
    return c.json({ error: "OP e data de saída são obrigatórios" }, 400);
  }
  
  // Check if OP already exists in lista_saida
  const existing = await c.env.DB.prepare(
    "SELECT id FROM lista_saida WHERE op_id = ?"
  ).bind(op_id).first();
  
  if (existing) {
    return c.json({ error: "OP já está na lista de saída" }, 400);
  }
  
  await c.env.DB.prepare(
    "INSERT INTO lista_saida (op_id, exit_date, exit_time, transportadora_id, regiao_id) VALUES (?, ?, ?, ?, ?)"
  ).bind(op_id, exit_date, exit_time || null, transportadora_id || null, regiao_id || null).run();
  
  return c.json({ success: true });
});

app.put("/api/lista-saida/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { exit_date, transportadora_id, regiao_id } = body;
  
  await c.env.DB.prepare(
    "UPDATE lista_saida SET exit_date = ?, transportadora_id = ?, regiao_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(exit_date, transportadora_id || null, regiao_id || null, id).run();
  
  return c.json({ success: true });
});

app.delete("/api/lista-saida/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM lista_saida WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// Laboratory KPIs endpoint
app.get("/api/laboratory/kpis", authMiddleware, async (c) => {
  // Total completed recipes (finalized in lab)
  const totalCompleted = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM po_laboratory"
  ).first();

  // Recipes that were ready (is_recipe_ready = 1)
  const readyRecipes = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM po_laboratory WHERE is_recipe_ready = 1"
  ).first();

  // New recipes developed (is_recipe_ready = 0, meaning new color development)
  const newRecipes = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM po_laboratory WHERE is_recipe_ready = 0 OR is_recipe_ready IS NULL"
  ).first();

  // Average batches (attempts) per recipe - only for new developments
  const avgBatches = await c.env.DB.prepare(
    "SELECT AVG(num_batches) as avg FROM po_laboratory WHERE num_batches IS NOT NULL AND num_batches > 0"
  ).first();

  // Total batches (attempts)
  const totalBatches = await c.env.DB.prepare(
    "SELECT SUM(num_batches) as total FROM po_laboratory WHERE num_batches IS NOT NULL"
  ).first();

  // OPs completed within 2 business days (on time) - approximate with calendar days
  const onTimeCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM po_laboratory 
    WHERE julianday(end_time) - julianday(start_time) <= 2
  `).first();

  // Pending OPs in lab
  const pendingOPs = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM production_orders 
    WHERE requires_lab = 1 
    AND lot_number IS NULL 
    AND parent_op_id IS NULL
    AND id NOT IN (SELECT op_id FROM po_laboratory)
  `).first();

  const total = (totalCompleted as any)?.count || 0;
  const onTime = (onTimeCount as any)?.count || 0;
  const yieldRate = total > 0 ? Math.round((onTime / total) * 100) : 0;

  return c.json({
    total_completed: total,
    ready_recipes: (readyRecipes as any)?.count || 0,
    new_recipes: (newRecipes as any)?.count || 0,
    avg_batches: Math.round(((avgBatches as any)?.avg || 0) * 10) / 10,
    total_batches: (totalBatches as any)?.total || 0,
    on_time_count: onTime,
    pending_ops: (pendingOPs as any)?.count || 0,
    yield_rate: yieldRate,
  });
});

export default app;
