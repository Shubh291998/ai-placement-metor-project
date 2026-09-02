// lib/rag/retriever.ts
import { searchLearningResources, type LearningResourceItem } from "./vector-store";

export async function retrieveRagContextForSkills(skills: string[]): Promise<{
  contextText: string;
  resources: LearningResourceItem[];
}> {
  if (!skills || skills.length === 0) {
    const defaultResources = await searchLearningResources("full stack web development system design", 3);
    return {
      contextText: defaultResources.map((r) => `- [${r.topic}] ${r.title}: ${r.content}`).join("\n"),
      resources: defaultResources,
    };
  }

  const query = skills.slice(0, 5).join(" ");
  const resources = await searchLearningResources(query, 5);

  const contextText = resources
    .map((r) => `- [${r.topic}] ${r.title} (${r.resource_type}): ${r.content}`)
    .join("\n");

  return {
    contextText,
    resources,
  };
}
