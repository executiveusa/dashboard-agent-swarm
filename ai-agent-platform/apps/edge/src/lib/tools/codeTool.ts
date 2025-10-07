import { z } from 'zod';
import { openInterpreter } from '../openInterpreter.js';

const codeSchema = z.object({
  runtime: z.enum(['python', 'node']).default('python'),
  source: z.string().min(1),
});

export type CodeToolInput = z.infer<typeof codeSchema>;

export const codeTool = {
  name: 'CodeTool',
  async execute(input: CodeToolInput, options: { sessionId?: string } = {}) {
    const payload = codeSchema.parse(input);
    return openInterpreter.runCode(payload.runtime, payload.source, { sessionId: options.sessionId });
  },
};

