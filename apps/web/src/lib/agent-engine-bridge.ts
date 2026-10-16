import {
  AgentMemoryStore,
  AgentSkillRegistry,
  BoundedAgentRuntime,
  ScientificExperimentRunner,
  AgentPolicyEngine,
} from "@prompt-workspace/prompt-engine";

let memoryStoreInstance: AgentMemoryStore | null = null;
let skillRegistryInstance: AgentSkillRegistry | null = null;
let runtimeInstance: BoundedAgentRuntime | null = null;
let experimentRunnerInstance: ScientificExperimentRunner | null = null;

export function getAgentMemoryStore(): AgentMemoryStore {
  if (!memoryStoreInstance) {
    memoryStoreInstance = new AgentMemoryStore();
  }
  return memoryStoreInstance;
}

export function getAgentSkillRegistry(): AgentSkillRegistry {
  if (!skillRegistryInstance) {
    skillRegistryInstance = new AgentSkillRegistry();
  }
  return skillRegistryInstance;
}

export function getBoundedAgentRuntime(): BoundedAgentRuntime {
  if (!runtimeInstance) {
    const memory = getAgentMemoryStore();
    const skills = getAgentSkillRegistry();
    runtimeInstance = new BoundedAgentRuntime({
      memoryStore: memory,
      skillRegistry: skills,
      policyEngine: new AgentPolicyEngine(),
    });
  }
  return runtimeInstance;
}

export function getScientificExperimentRunner(): ScientificExperimentRunner {
  if (!experimentRunnerInstance) {
    const memory = getAgentMemoryStore();
    const skills = getAgentSkillRegistry();
    experimentRunnerInstance = new ScientificExperimentRunner({
      memoryStore: memory,
      skillRegistry: skills,
    });
  }
  return experimentRunnerInstance;
}
