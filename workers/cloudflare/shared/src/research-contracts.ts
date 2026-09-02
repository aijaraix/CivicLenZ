import {
  OFFICE_CLASS_CONTRACTS,
  type OfficeClass,
  type OfficeClassContract,
} from "./office-classes.ts";
import type { CivicStore } from "./store.ts";
import type { ResearchContractFieldRecord, ResearchContractRecord } from "./types.ts";

export async function persistOfficeClassContract(
  store: CivicStore,
  officeClass: OfficeClass,
): Promise<{ contract: ResearchContractRecord & { fields: OfficeClassContract["fields"]; officeClass: OfficeClass }; fields: ResearchContractFieldRecord[] }> {
  const spec = OFFICE_CLASS_CONTRACTS[officeClass];
  const contract = await store.upsertResearchContract({
    contractKey: spec.contractKey,
    name: spec.name,
    officeClass: spec.officeClass,
    version: spec.version,
    active: spec.active,
    description: spec.description,
  });
  const fields: ResearchContractFieldRecord[] = [];
  for (const [index, field] of spec.fields.entries()) {
    fields.push(
      await store.upsertResearchContractField({
        researchContractId: contract.researchContractId,
        fieldKey: field.fieldKey,
        category: field.openEnded ? "open" : field.category,
        requiredForBaseline: field.requiredForBaseline,
        verificationRequirement: field.verificationRequirement,
        sourcePriority: field.preferredSources.join(","),
        volatilityClass: field.volatility,
        recheckPolicy: field.recheckInterval,
        sensitivityRule: field.openEnded
          ? "coverage_complete_for_defined_scope"
          : field.datasetReconciliation
            ? `dataset:${field.datasetReconciliation}`
            : field.publicationPolicy,
        sortOrder: index,
      }),
    );
  }
  return {
    contract: { ...contract, fields: spec.fields, officeClass: spec.officeClass },
    fields,
  };
}
