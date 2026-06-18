import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type {
  ConflictMap,
  DealProfile,
  GeneratedDocument,
  KickoffPacket,
  SeedData,
  StakeholderCall,
} from "./types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, "..", "data", "northwind.json");

function loadSeed(): SeedData {
  const raw = readFileSync(SEED_PATH, "utf-8");
  return JSON.parse(raw) as SeedData;
}

/** Plain in-memory state, seeded once from data/northwind.json. Resets on server restart. */
class Store {
  dealProfiles: DealProfile[] = [];
  stakeholderCalls: StakeholderCall[] = [];
  generatedDocuments: GeneratedDocument[] = [];
  conflictMaps: ConflictMap[] = [];
  kickoffPackets: KickoffPacket[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    const seed = loadSeed();
    this.dealProfiles = seed.dealProfiles;
    this.stakeholderCalls = seed.stakeholderCalls;
    this.generatedDocuments = seed.generatedDocuments;
    this.conflictMaps = seed.conflictMaps;
    this.kickoffPackets = seed.kickoffPackets;
  }

  listDealProfiles() {
    return [...this.dealProfiles].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  getDealProfile(id: string) {
    return this.dealProfiles.find((p) => p.id === id) ?? null;
  }

  insertDealProfile(profile: Omit<DealProfile, "id" | "createdAt">): DealProfile {
    const row: DealProfile = { ...profile, id: randomUUID(), createdAt: new Date().toISOString() };
    this.dealProfiles.push(row);
    return row;
  }

  listCallsForProfile(dealProfileId: string) {
    return this.stakeholderCalls.filter((c) => c.dealProfileId === dealProfileId);
  }

  getCall(id: string) {
    return this.stakeholderCalls.find((c) => c.id === id) ?? null;
  }

  findCall(dealProfileId: string, stakeholderId: string) {
    return this.stakeholderCalls.find((c) => c.dealProfileId === dealProfileId && c.stakeholderId === stakeholderId) ?? null;
  }

  upsertCall(dealProfileId: string, stakeholderId: string, role: string, patch: Partial<StakeholderCall>): StakeholderCall {
    const existing = this.findCall(dealProfileId, stakeholderId);
    if (existing) {
      Object.assign(existing, patch);
      return existing;
    }
    const row: StakeholderCall = {
      id: randomUUID(),
      dealProfileId,
      stakeholderId,
      role,
      status: "scheduled",
      transcript: null,
      extractedData: null,
      generatedDocId: null,
      createdAt: new Date().toISOString(),
      ...patch,
    };
    this.stakeholderCalls.push(row);
    return row;
  }

  updateCall(id: string, patch: Partial<StakeholderCall>) {
    const call = this.getCall(id);
    if (!call) return null;
    Object.assign(call, patch);
    return call;
  }

  insertGeneratedDocument(doc: Omit<GeneratedDocument, "id" | "createdAt">): GeneratedDocument {
    const row: GeneratedDocument = { ...doc, id: randomUUID(), createdAt: new Date().toISOString() };
    this.generatedDocuments.push(row);
    return row;
  }

  getGeneratedDocument(id: string) {
    return this.generatedDocuments.find((d) => d.id === id) ?? null;
  }

  latestConflictMap(dealProfileId: string) {
    return (
      this.conflictMaps
        .filter((c) => c.dealProfileId === dealProfileId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }

  insertConflictMap(dealProfileId: string, conflicts: ConflictMap["conflicts"]): ConflictMap {
    const row: ConflictMap = { id: randomUUID(), dealProfileId, conflicts, createdAt: new Date().toISOString() };
    this.conflictMaps.push(row);
    return row;
  }

  latestKickoffPacket(dealProfileId: string) {
    return (
      this.kickoffPackets
        .filter((k) => k.dealProfileId === dealProfileId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }

  insertKickoffPacket(packet: Omit<KickoffPacket, "id" | "createdAt">): KickoffPacket {
    const row: KickoffPacket = { ...packet, id: randomUUID(), createdAt: new Date().toISOString() };
    this.kickoffPackets.push(row);
    return row;
  }
}

export const store = new Store();
