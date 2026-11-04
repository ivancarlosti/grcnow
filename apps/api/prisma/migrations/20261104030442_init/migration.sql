-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "plan" TEXT NOT NULL DEFAULT 'standard',
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0f766e',
    "defaultLocale" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "jobTitle" TEXT,
    "phone" TEXT,
    "locale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isCompanyAdmin" BOOLEAN NOT NULL DEFAULT false,
    "unassigned" BOOLEAN NOT NULL DEFAULT false,
    "keycloakSub" TEXT,
    "avatarUrl" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "namespace" TEXT NOT NULL DEFAULT 'common',
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT,
    "entity" TEXT,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "type" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "params" JSONB,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "event" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "webhook_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB,
    "statusCode" INTEGER,
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "driver" TEXT NOT NULL,
    "category" TEXT,
    "entity" TEXT,
    "entityId" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT,
    "approverId" TEXT,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_fields" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "tab" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_tabs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "custom_tabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" JSONB NOT NULL,
    "statusKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'slate',
    "icon" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "status_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_views" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_units" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "parentId" TEXT,
    "managerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT NOT NULL DEFAULT 'information',
    "classification" TEXT NOT NULL DEFAULT 'internal',
    "ownerId" TEXT,
    "businessUnitId" TEXT,
    "vendorId" TEXT,
    "description" TEXT,
    "criticality" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'active',
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT NOT NULL DEFAULT 'supplier',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "website" TEXT,
    "country" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'active',
    "reviewDate" TIMESTAMP(3),
    "description" TEXT,
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controls" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "objective" TEXT,
    "type" TEXT NOT NULL DEFAULT 'preventive',
    "category" TEXT NOT NULL DEFAULT 'operational',
    "ownerId" TEXT,
    "businessUnitId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "frequency" TEXT NOT NULL DEFAULT 'quarterly',
    "implementation" TEXT NOT NULL DEFAULT 'manual',
    "lastTestedAt" TIMESTAMP(3),
    "nextTestAt" TIMESTAMP(3),
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_tests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "testedById" TEXT,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "evidenceFileIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'operational',
    "ownerId" TEXT,
    "businessUnitId" TEXT,
    "assetId" TEXT,
    "likelihood" INTEGER NOT NULL DEFAULT 3,
    "impact" INTEGER NOT NULL DEFAULT 3,
    "score" INTEGER NOT NULL DEFAULT 9,
    "residualLikelihood" INTEGER NOT NULL DEFAULT 3,
    "residualImpact" INTEGER NOT NULL DEFAULT 3,
    "residualScore" INTEGER NOT NULL DEFAULT 9,
    "treatment" TEXT NOT NULL DEFAULT 'mitigate',
    "treatmentPlan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'identified',
    "appetiteExceeded" BOOLEAN NOT NULL DEFAULT false,
    "reviewDate" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_reviews" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "risk_id" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" TEXT NOT NULL DEFAULT 'accepted',
    "notes" TEXT,
    "scoreAtReview" INTEGER,

    CONSTRAINT "risk_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_matrices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "likelihoodScale" JSONB NOT NULL,
    "impactScale" JSONB NOT NULL,
    "thresholds" JSONB NOT NULL,
    "appetite" INTEGER NOT NULL DEFAULT 12,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_matrices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_packages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "description" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT true,
    "sourceUrl" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_chapters" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "compliance_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_requirements" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "compliance_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_mappings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'implemented',
    "notes" TEXT,
    "mappedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "ownerId" TEXT,
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "source" TEXT NOT NULL DEFAULT 'internal_audit',
    "auditType" TEXT NOT NULL DEFAULT 'internal',
    "controlId" TEXT,
    "closedAt" TIMESTAMP(3),
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'governance',
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "content" TEXT,
    "summary" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "requiresAck" BOOLEAN NOT NULL DEFAULT true,
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_versions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "content" TEXT,
    "changeSummary" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_acks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_acks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exceptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "justification" TEXT,
    "riskId" TEXT,
    "controlId" TEXT,
    "policyId" TEXT,
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "ownerId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "riskIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "controlIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirementIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'security',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'detected',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedBy" TEXT,
    "ownerId" TEXT,
    "containedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "lessonsLearned" TEXT,
    "riskId" TEXT,
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_continuity_plans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "businessUnitId" TEXT,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rtoHours" INTEGER NOT NULL DEFAULT 24,
    "rpoHours" INTEGER NOT NULL DEFAULT 24,
    "lastTestedAt" TIMESTAMP(3),
    "nextTestAt" TIMESTAMP(3),
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_continuity_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bcp_tests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "bcp_id" TEXT NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "testedBy" TEXT,

    CONSTRAINT "bcp_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "scoring" JSONB,
    "entityType" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT 'user',
    "targetId" TEXT,
    "targetEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "score" INTEGER,
    "answers" JSONB,
    "publicToken" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_courses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "materialFileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "category" TEXT NOT NULL DEFAULT 'security',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,

    CONSTRAINT "training_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_reviews" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reviewerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dueDate" TIMESTAMP(3),
    "system" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_review_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "system" TEXT,
    "ownerName" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decision" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "account_review_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whistleblowing_reports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "severity" TEXT,
    "contactEmail" TEXT,
    "ip" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "whistleblowing_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_flows" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'internal',
    "sourceId" TEXT,
    "destinationType" TEXT NOT NULL DEFAULT 'internal',
    "destinationId" TEXT,
    "dataCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "personalData" BOOLEAN NOT NULL DEFAULT true,
    "transferMechanism" TEXT,
    "country" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'continuous',
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_activities" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT,
    "legalBasis" TEXT NOT NULL DEFAULT 'legitimate_interest',
    "controller" TEXT,
    "dpo" TEXT,
    "dataSubjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dataCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recipients" TEXT,
    "retention" TEXT,
    "crossBorder" BOOLEAN NOT NULL DEFAULT false,
    "safeguards" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloakSub_key" ON "users"("keycloakSub");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_id_key" ON "users"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "roles_tenant_id_idx" ON "roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_key_key" ON "roles"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "user_roles_tenant_id_idx" ON "user_roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_tokenHash_key" ON "api_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "api_tokens_tenant_id_idx" ON "api_tokens"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_tenant_id_key_key" ON "settings"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "translations_locale_idx" ON "translations"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "translations_locale_namespace_key_key" ON "translations"("locale", "namespace", "key");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_createdAt_idx" ON "audit_logs"("tenant_id", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_user_id_createdAt_idx" ON "notifications"("tenant_id", "user_id", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_tenant_id_event_locale_key" ON "notification_templates"("tenant_id", "event", "locale");

-- CreateIndex
CREATE INDEX "webhooks_tenant_id_idx" ON "webhooks"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhooks_tenant_id_id_key" ON "webhooks"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_tenant_id_createdAt_idx" ON "webhook_deliveries"("tenant_id", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "files_storageKey_key" ON "files"("storageKey");

-- CreateIndex
CREATE INDEX "files_tenant_id_entity_entityId_idx" ON "files"("tenant_id", "entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "files_tenant_id_id_key" ON "files"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "comments_tenant_id_entity_entityId_idx" ON "comments"("tenant_id", "entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "comments_tenant_id_id_key" ON "comments"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "approvals_tenant_id_entity_entityId_idx" ON "approvals"("tenant_id", "entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "approvals_tenant_id_id_key" ON "approvals"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "custom_fields_tenant_id_module_idx" ON "custom_fields"("tenant_id", "module");

-- CreateIndex
CREATE UNIQUE INDEX "custom_fields_tenant_id_module_key_key" ON "custom_fields"("tenant_id", "module", "key");

-- CreateIndex
CREATE UNIQUE INDEX "custom_tabs_tenant_id_module_key_key" ON "custom_tabs"("tenant_id", "module", "key");

-- CreateIndex
CREATE INDEX "status_rules_tenant_id_module_idx" ON "status_rules"("tenant_id", "module");

-- CreateIndex
CREATE UNIQUE INDEX "status_rules_tenant_id_id_key" ON "status_rules"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "saved_views_tenant_id_userId_module_idx" ON "saved_views"("tenant_id", "userId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "saved_views_tenant_id_id_key" ON "saved_views"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "automation_rules_tenant_id_event_idx" ON "automation_rules"("tenant_id", "event");

-- CreateIndex
CREATE UNIQUE INDEX "automation_rules_tenant_id_id_key" ON "automation_rules"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "business_units_tenant_id_idx" ON "business_units"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_units_tenant_id_id_key" ON "business_units"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "assets_tenant_id_idx" ON "assets"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_tenant_id_id_key" ON "assets"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "vendors_tenant_id_idx" ON "vendors"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_tenant_id_id_key" ON "vendors"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "controls_tenant_id_idx" ON "controls"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "controls_tenant_id_id_key" ON "controls"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "control_tests_tenant_id_control_id_idx" ON "control_tests"("tenant_id", "control_id");

-- CreateIndex
CREATE UNIQUE INDEX "control_tests_tenant_id_id_key" ON "control_tests"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "risks_tenant_id_idx" ON "risks"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "risks_tenant_id_id_key" ON "risks"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "risk_reviews_tenant_id_risk_id_idx" ON "risk_reviews"("tenant_id", "risk_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_reviews_tenant_id_id_key" ON "risk_reviews"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "risk_matrices_tenant_id_idx" ON "risk_matrices"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_matrices_tenant_id_id_key" ON "risk_matrices"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "compliance_packages_tenant_id_idx" ON "compliance_packages"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_packages_tenant_id_slug_version_key" ON "compliance_packages"("tenant_id", "slug", "version");

-- CreateIndex
CREATE INDEX "compliance_chapters_package_id_idx" ON "compliance_chapters"("package_id");

-- CreateIndex
CREATE INDEX "compliance_requirements_package_id_idx" ON "compliance_requirements"("package_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_requirements_package_id_ref_key" ON "compliance_requirements"("package_id", "ref");

-- CreateIndex
CREATE INDEX "compliance_mappings_tenant_id_requirement_id_idx" ON "compliance_mappings"("tenant_id", "requirement_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_mappings_tenant_id_id_key" ON "compliance_mappings"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_mappings_tenant_id_requirement_id_entity_type_en_key" ON "compliance_mappings"("tenant_id", "requirement_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_findings_tenant_id_idx" ON "audit_findings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_findings_tenant_id_id_key" ON "audit_findings"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "policies_tenant_id_idx" ON "policies"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "policies_tenant_id_id_key" ON "policies"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "policy_versions_tenant_id_policy_id_idx" ON "policy_versions"("tenant_id", "policy_id");

-- CreateIndex
CREATE UNIQUE INDEX "policy_versions_tenant_id_id_key" ON "policy_versions"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "policy_acks_tenant_id_idx" ON "policy_acks"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "policy_acks_policy_id_user_id_key" ON "policy_acks"("policy_id", "user_id");

-- CreateIndex
CREATE INDEX "exceptions_tenant_id_idx" ON "exceptions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "exceptions_tenant_id_id_key" ON "exceptions"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "projects_tenant_id_idx" ON "projects"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_tenant_id_id_key" ON "projects"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "tasks_tenant_id_project_id_idx" ON "tasks"("tenant_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_tenant_id_id_key" ON "tasks"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "incidents_tenant_id_idx" ON "incidents"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_tenant_id_id_key" ON "incidents"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "business_continuity_plans_tenant_id_idx" ON "business_continuity_plans"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_continuity_plans_tenant_id_id_key" ON "business_continuity_plans"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "bcp_tests_tenant_id_bcp_id_idx" ON "bcp_tests"("tenant_id", "bcp_id");

-- CreateIndex
CREATE UNIQUE INDEX "bcp_tests_tenant_id_id_key" ON "bcp_tests"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "assessment_templates_tenant_id_idx" ON "assessment_templates"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_templates_tenant_id_id_key" ON "assessment_templates"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_publicToken_key" ON "assessments"("publicToken");

-- CreateIndex
CREATE INDEX "assessments_tenant_id_idx" ON "assessments"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_tenant_id_id_key" ON "assessments"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "training_courses_tenant_id_idx" ON "training_courses"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "training_courses_tenant_id_id_key" ON "training_courses"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "training_assignments_tenant_id_course_id_idx" ON "training_assignments"("tenant_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "training_assignments_tenant_id_id_key" ON "training_assignments"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "account_reviews_tenant_id_idx" ON "account_reviews"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_reviews_tenant_id_id_key" ON "account_reviews"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "account_review_items_tenant_id_review_id_idx" ON "account_review_items"("tenant_id", "review_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_review_items_tenant_id_id_key" ON "account_review_items"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "whistleblowing_reports_token_key" ON "whistleblowing_reports"("token");

-- CreateIndex
CREATE INDEX "whistleblowing_reports_tenant_id_idx" ON "whistleblowing_reports"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "whistleblowing_reports_tenant_id_id_key" ON "whistleblowing_reports"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "data_flows_tenant_id_idx" ON "data_flows"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "data_flows_tenant_id_id_key" ON "data_flows"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "processing_activities_tenant_id_idx" ON "processing_activities"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "processing_activities_tenant_id_id_key" ON "processing_activities"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_tests" ADD CONSTRAINT "control_tests_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_reviews" ADD CONSTRAINT "risk_reviews_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_chapters" ADD CONSTRAINT "compliance_chapters_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "compliance_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_requirements" ADD CONSTRAINT "compliance_requirements_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "compliance_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_requirements" ADD CONSTRAINT "compliance_requirements_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "compliance_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_mappings" ADD CONSTRAINT "compliance_mappings_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "compliance_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_acks" ADD CONSTRAINT "policy_acks_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bcp_tests" ADD CONSTRAINT "bcp_tests_bcp_id_fkey" FOREIGN KEY ("bcp_id") REFERENCES "business_continuity_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "assessment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_review_items" ADD CONSTRAINT "account_review_items_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "account_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
