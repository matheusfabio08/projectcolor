import { z } from "zod";

export const POStatus = z.enum([
  "almoxarifado",
  "qualidade_malhas",
  "preparacao",
  "box4",
  "box5",
  "box6",
  "producao",
  "secadora",
  "destrinchagem",
  "enrolagem",
  "qualidade",
  "concluido",
]);

export const POItemSchema = z.object({
  material: z.string(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  requires_lab: z.boolean().optional(),
  requires_fabric_quality: z.boolean().optional(),
});

export const CreatePORequestSchema = z.object({
  client: z.string(),
  color: z.string(),
  order_number: z.string().optional(),
  entry_date: z.string().optional(),
  expected_date: z.string().optional(),
  description: z.string().optional(),
  items: z.array(POItemSchema),
  region_jaragua: z.boolean().optional(),
  region_brusque: z.boolean().optional(),
  region_gaspar: z.boolean().optional(),
  fiber_id: z.number().nullable().optional(),
  is_dual_fiber: z.boolean().optional(),
  fiber2_id: z.number().nullable().optional(),
});

export const PreparationRequestSchema = z.object({
  po_id: z.number(),
  employee_meters: z.array(z.object({
    employee_id: z.string(),
    meters: z.number(),
  })),
  splices: z.array(z.string()),
  total_weight: z.number(),
  destination_box: z.string(),
  start_time: z.string(),
  end_time: z.string(),
});

export const BatchPreparationRequestSchema = z.object({
  color: z.string(),
  employee_meters: z.array(z.object({
    employee_id: z.string(),
    meters: z.number(),
  })),
  splices: z.array(z.string()),
  total_weight: z.number(),
  destination_box: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  ops: z.array(z.object({
    op_id: z.number(),
    meters: z.number(),
  })),
});

export const ProductionRequestSchema = z.object({
  po_id: z.number(),
  box_number: z.string(),
  machine: z.string(),
  operator: z.string(),
  has_adjustment: z.boolean(),
  start_date: z.string(),
  end_date: z.string(),
  meters_produced: z.number(),
});

export const DryerRequestSchema = z.object({
  po_id: z.number(),
  destination: z.string(),
});

export const UntanglingRequestSchema = z.object({
  po_id: z.number(),
  num_employees: z.number(),
  meters_per_employee: z.number(),
  employee_times: z.array(z.string()),
  start_time: z.string(),
  end_time: z.string(),
});

export const RollingRequestSchema = z.object({
  po_id: z.number(),
  employee_ids: z.array(z.string()),
  num_splices: z.number(),
  num_rolls: z.number(),
  issue_description: z.string().optional(),
  start_time: z.string(),
  end_time: z.string(),
});

export const QualityRequestSchema = z.object({
  po_id: z.number(),
  rolls_sent: z.number(),
  meters_per_roll: z.number(),
  discrepancy: z.string().optional(),
});

export const LaboratoryRequestSchema = z.object({
  po_id: z.number(),
  num_batches: z.number().optional(),
  is_recipe_ready: z.boolean(),
  recipe_origin_date: z.string().optional(),
  description: z.string().optional(),
  is_approved: z.boolean(),
  start_time: z.string(),
  end_time: z.string(),
});

export const Box5RequestSchema = z.object({
  po_id: z.number(),
  employee_id: z.string(),
  has_adjustment: z.boolean(),
  adjustment_details: z.string().optional(),
  is_reprocess: z.boolean(),
  reprocess_reason: z.string().optional(),
  timestamp: z.string(),
});

export const Box4RequestSchema = z.object({
  po_id: z.number(),
  employee_id: z.string(),
  has_adjustment: z.boolean(),
  adjustment_details: z.string().optional(),
  is_reprocess: z.boolean(),
  reprocess_reason: z.string().optional(),
  timestamp: z.string(),
});

export const Box6RequestSchema = z.object({
  po_id: z.number(),
  employee_id: z.string(),
  has_adjustment: z.boolean(),
  adjustment_details: z.string().optional(),
  is_reprocess: z.boolean(),
  reprocess_reason: z.string().optional(),
  timestamp: z.string(),
});

export const CreateEmployeeRequestSchema = z.object({
  name: z.string(),
  sector: z.string(),
});

export const FabricQualityInspectionSchema = z.object({
  item_description: z.string(),
  weight: z.number(),
  destination_sector: z.string(),
  observations: z.string().optional(),
  defect_image_url: z.string().optional(),
  employee_name: z.string(),
  inspection_date: z.string(),
  priority: z.enum(["normal", "urgent"]).optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
});

export interface ProductionOrder {
  id: number;
  op_number: string;
  client: string;
  color: string;
  order_number?: string;
  entry_date: string;
  expected_date: string;
  requires_lab: boolean;
  requires_fabric_quality?: boolean;
  status: z.infer<typeof POStatus>;
  responsible_user_id?: string;
  current_stage: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  description?: string;
  sheet_id?: number;
  material?: string;
  quantity?: number;
  unit?: string;
}

export interface Employee {
  id: number;
  name: string;
  sector: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PreparationBatch {
  id: number;
  batch_number: string;
  color: string;
  total_weight: number;
  destination_box: string;
  employee_ids: string;
  splices: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface BatchOP {
  id: number;
  batch_id: number;
  op_id: number;
  meters_in_batch: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardKPIs {
  active_ops: number;
  overdue_ops: number;
  completed_today: number;
  productivity_rate: number;
}

export interface FabricQualityInspection {
  id: number;
  inspection_number: string;
  item_description: string;
  weight: number;
  destination_sector: string;
  observations?: string;
  defect_image_url?: string;
  employee_name: string;
  inspection_date: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}
