import { z } from 'zod';
import { openInterpreter, type BrowserAction } from '../openInterpreter.js';

const browserPlanSchema = z.object({
  actions: z
    .array(
      z.object({
        verb: z.enum(['open', 'click', 'type', 'waitFor', 'screenshot', 'evaluate']),
        args: z.array(z.any()).optional(),
      })
    )
    .min(1),
});

export interface BrowserToolInput {
  actions: BrowserAction[];
}

export const browserTool = {
  name: 'BrowserTool',
  async execute(input: BrowserToolInput, options: { sessionId?: string } = {}) {
    const plan = browserPlanSchema.parse(input);
    return openInterpreter.executeBrowserPlan(plan.actions, { sessionId: options.sessionId });
  },
};

