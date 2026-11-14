-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StructureType" AS ENUM ('BRIGADA', 'FACULTAD', 'SEDE', 'FILIAL', 'RESIDENCIA', 'CENTRO', 'NACIONAL');

-- CreateEnum
CREATE TYPE "ProcessType" AS ENUM ('SECRETARIADO', 'PRESIDENTE');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('CONVOCADO', 'ABIERTA', 'CERRADA', 'SIN_QUORUM', 'EMPATE', 'PROCLAMADA', 'VP_DESIGNADA', 'FINALIZADA', 'VACANTE');

-- CreateEnum
CREATE TYPE "VotingMode" AS ENUM ('SECRET', 'PUBLIC');

-- CreateEnum
CREATE TYPE "TieRule" AS ENUM ('PRESIDENT_VOTES_THEN_RUNOFF');

-- CreateEnum
CREATE TYPE "MajorityRule" AS ENUM ('TOP_N', 'TOP_N_OVER_50', 'FIFTY_PLUS_ONE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COMMISSION', 'VOTER', 'OBSERVER');

-- CreateEnum
CREATE TYPE "BallotState" AS ENUM ('VALIDA', 'ANULADA_POR_ELECTOR');

-- CreateEnum
CREATE TYPE "Office" AS ENUM ('PRESIDENTE', 'VICEPRESIDENTE', 'MIEMBRO', 'NO_ELECTO');

-- CreateEnum
CREATE TYPE "CommissionRole" AS ENUM ('PRESIDENTE', 'SECRETARIO', 'MIEMBRO');

-- CreateEnum
CREATE TYPE "VacancyType" AS ENUM ('RENUNCIA', 'SEPARACION', 'INCAPACIDAD', 'FALLECIMIENTO');

-- CreateTable
CREATE TABLE "structures" (
    "id" TEXT NOT NULL,
    "type" "StructureType" NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brigades" (
    "id" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brigades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "brigadeId" TEXT,
    "eligible" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "ci" TEXT,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VOTER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mfaSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electoral_processes" (
    "id" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "type" "ProcessType" NOT NULL DEFAULT 'SECRETARIADO',
    "academicYear" TEXT NOT NULL,
    "status" "ProcessStatus" NOT NULL DEFAULT 'CONVOCADO',
    "parentProcessId" TEXT,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "candidatesCount" INTEGER NOT NULL DEFAULT 0,
    "seats" INTEGER NOT NULL DEFAULT 0,
    "proposalSlots" INTEGER NOT NULL DEFAULT 0,
    "votingMode" "VotingMode" NOT NULL DEFAULT 'SECRET',
    "quorumPct" DECIMAL(5,2) NOT NULL DEFAULT 85,
    "quorumExceptionPct" DECIMAL(5,2),
    "majorityRule" "MajorityRule" NOT NULL DEFAULT 'TOP_N',
    "tieRule" "TieRule" NOT NULL DEFAULT 'PRESIDENT_VOTES_THEN_RUNOFF',
    "columns" TEXT[] DEFAULT ARRAY['NAME', 'BRIGADE', 'MEMBER', 'PRESIDENT']::TEXT[],
    "snapshotHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electoral_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidacies" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CARGA',
    "totalCandidates" INTEGER NOT NULL DEFAULT 0,
    "councilApprovedAt" TIMESTAMP(3),
    "councilActa" TEXT,
    "councilQuorumPct" DECIMAL(5,2),
    "councilVotesFor" INTEGER,
    "councilVotesAgainst" INTEGER,
    "hash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidacies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "firstSurname" TEXT NOT NULL,
    "secondSurname" TEXT,
    "name" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "facultyId" TEXT,
    "brigadeId" TEXT,
    "year" INTEGER,
    "gender" TEXT,
    "biographyMd" TEXT,
    "biographyHash" TEXT,
    "biographyUpdatedAt" TIMESTAMP(3),
    "brigadeValidated" BOOLEAN NOT NULL DEFAULT false,
    "validationEvidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_candidates" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "ballotPosition" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVO',
    "memberVotes" INTEGER NOT NULL DEFAULT 0,
    "presidentVotes" INTEGER NOT NULL DEFAULT 0,
    "elected" BOOLEAN NOT NULL DEFAULT false,
    "office" "Office" NOT NULL DEFAULT 'NO_ELECTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ballots" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "state" "BallotState" NOT NULL DEFAULT 'VALIDA',
    "receiptHash" TEXT NOT NULL,
    "motivos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "integrityHash" TEXT NOT NULL,
    "mode" "VotingMode" NOT NULL DEFAULT 'SECRET',

    CONSTRAINT "ballots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ballot_selections" (
    "id" TEXT NOT NULL,
    "ballotId" TEXT NOT NULL,
    "processCandidateId" TEXT NOT NULL,
    "member" BOOLEAN NOT NULL DEFAULT false,
    "president" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ballot_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participations" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'WEB',

    CONSTRAINT "participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "validBallots" INTEGER NOT NULL DEFAULT 0,
    "annulledBallots" INTEGER NOT NULL DEFAULT 0,
    "participation" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "quorumPct" DECIMAL(5,2) NOT NULL DEFAULT 85,
    "quorumMet" BOOLEAN NOT NULL DEFAULT false,
    "hash" TEXT NOT NULL,
    "status" "ProcessStatus" NOT NULL DEFAULT 'CERRADA',
    "composition" JSONB,
    "proclaimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vice_president_designations" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "electedId" TEXT NOT NULL,
    "recommendedId" TEXT,
    "designatedBy" TEXT,
    "reason" TEXT,
    "acta" TEXT,
    "designatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DESIGNADA',

    CONSTRAINT "vice_president_designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacancy_events" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "office" "Office" NOT NULL,
    "type" "VacancyType" NOT NULL,
    "reason" TEXT,
    "acta" TEXT,
    "successorId" TEXT,
    "recommendedId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ABIERTA',
    "compositionVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "vacancy_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "presidentId" TEXT,
    "vicePresidentId" TEXT,
    "members" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "acta" TEXT,
    "constitutedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_seats" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CommissionRole" NOT NULL,

    CONSTRAINT "commission_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acts" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "signers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedById" TEXT,

    CONSTRAINT "acts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "processId" TEXT,
    "actorId" TEXT,
    "actorCi" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL DEFAULT 'PROCESO',
    "details" JSONB,
    "prevHash" TEXT,
    "hash" TEXT,
    "payloadHash" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulation_articles" (
    "id" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "part" TEXT NOT NULL DEFAULT 'REGLAMENTO',
    "article" TEXT NOT NULL,
    "page" INTEGER,
    "literalText" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regulation_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "structures_parentId_idx" ON "structures"("parentId");

-- CreateIndex
CREATE INDEX "structures_type_idx" ON "structures"("type");

-- CreateIndex
CREATE INDEX "brigades_structureId_idx" ON "brigades"("structureId");

-- CreateIndex
CREATE UNIQUE INDEX "brigades_structureId_code_key" ON "brigades"("structureId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_key" ON "memberships"("userId");

-- CreateIndex
CREATE INDEX "memberships_structureId_eligible_idx" ON "memberships"("structureId", "eligible");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_structureId_studentId_key" ON "memberships"("structureId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "users_ci_key" ON "users"("ci");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "electoral_processes_structureId_academicYear_idx" ON "electoral_processes"("structureId", "academicYear");

-- CreateIndex
CREATE INDEX "electoral_processes_status_idx" ON "electoral_processes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "candidacies_processId_key" ON "candidacies"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_ci_key" ON "candidates"("ci");

-- CreateIndex
CREATE UNIQUE INDEX "process_candidates_processId_candidateId_key" ON "process_candidates"("processId", "candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "process_candidates_processId_ballotPosition_key" ON "process_candidates"("processId", "ballotPosition");

-- CreateIndex
CREATE INDEX "ballots_processId_state_idx" ON "ballots"("processId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ballots_processId_receiptHash_key" ON "ballots"("processId", "receiptHash");

-- CreateIndex
CREATE INDEX "ballot_selections_processCandidateId_idx" ON "ballot_selections"("processCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ballot_selections_ballotId_processCandidateId_key" ON "ballot_selections"("ballotId", "processCandidateId");

-- CreateIndex
CREATE INDEX "participations_processId_idx" ON "participations"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "participations_processId_membershipId_key" ON "participations"("processId", "membershipId");

-- CreateIndex
CREATE INDEX "results_processId_idx" ON "results"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "commissions_processId_key" ON "commissions"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "commission_seats_commissionId_userId_key" ON "commission_seats"("commissionId", "userId");

-- CreateIndex
CREATE INDEX "acts_processId_idx" ON "acts"("processId");

-- CreateIndex
CREATE INDEX "audit_events_processId_sequence_idx" ON "audit_events"("processId", "sequence");

-- CreateIndex
CREATE INDEX "regulation_articles_document_part_idx" ON "regulation_articles"("document", "part");

-- CreateIndex
CREATE UNIQUE INDEX "regulation_articles_document_part_article_key" ON "regulation_articles"("document", "part", "article");

-- AddForeignKey
ALTER TABLE "structures" ADD CONSTRAINT "structures_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brigades" ADD CONSTRAINT "brigades_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_brigadeId_fkey" FOREIGN KEY ("brigadeId") REFERENCES "brigades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electoral_processes" ADD CONSTRAINT "electoral_processes_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electoral_processes" ADD CONSTRAINT "electoral_processes_parentProcessId_fkey" FOREIGN KEY ("parentProcessId") REFERENCES "electoral_processes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidacies" ADD CONSTRAINT "candidacies_processId_fkey" FOREIGN KEY ("processId") REFERENCES "electoral_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_brigadeId_fkey" FOREIGN KEY ("brigadeId") REFERENCES "brigades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_candidates" ADD CONSTRAINT "process_candidates_processId_fkey" FOREIGN KEY ("processId") REFERENCES "electoral_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_candidates" ADD CONSTRAINT "process_candidates_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_processId_fkey" FOREIGN KEY ("processId") REFERENCES "electoral_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballot_selections" ADD CONSTRAINT "ballot_selections_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "ballots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ballot_selections" ADD CONSTRAINT "ballot_selections_processCandidateId_fkey" FOREIGN KEY ("processCandidateId") REFERENCES "process_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations" ADD CONSTRAINT "participations_processId_fkey" FOREIGN KEY ("processId") REFERENCES "electoral_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations" ADD CONSTRAINT "participations_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_processId_fkey" FOREIGN KEY ("processId") REFERENCES "electoral_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vice_president_designations" ADD CONSTRAINT "vice_president_designations_processId_fkey" FOREIGN KEY ("processId") REFERENCES "electoral_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacancy_events" ADD CONSTRAINT "vacancy_events_processId_fkey" FOREIGN KEY ("processId") REFERENCES "electoral_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_processId_fkey" FOREIGN KEY ("processId") REFERENCES "electoral_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_seats" ADD CONSTRAINT "commission_seats_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "commissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_seats" ADD CONSTRAINT "commission_seats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acts" ADD CONSTRAINT "acts_processId_fkey" FOREIGN KEY ("processId") REFERENCES "electoral_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acts" ADD CONSTRAINT "acts_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_processId_fkey" FOREIGN KEY ("processId") REFERENCES "electoral_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

