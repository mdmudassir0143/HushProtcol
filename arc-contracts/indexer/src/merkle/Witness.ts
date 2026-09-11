import type {PoseidonTree} from "./PoseidonTree.js";
import type {WitnessResponse} from "../types/index.js";

/** Thin helper around PoseidonTree witness generation. */
export async function buildWitness(
  tree: PoseidonTree,
  leafIndex: number
): Promise<WitnessResponse> {
  return tree.witness(leafIndex);
}
