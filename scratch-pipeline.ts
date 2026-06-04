import { leadPipelineService } from './apps/shell-host/src/pages/jaldee-leads/services/pipelineService.ts';

async function run() {
  const data = await leadPipelineService.search({}, { page: 0, size: 1 });
  console.log("PIPELINE RAW:", JSON.stringify(data, null, 2));
}

run().catch(console.error);
