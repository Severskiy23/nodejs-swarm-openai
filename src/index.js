import { Agent } from './agent.js';
import { Swarm } from './swarm.js';
import { convertFunctionToJsonSchema } from './tool.js';

export function printMessagesPretty(messages) {
  for (const msg of messages) {
    if (msg.role === 'user') {
      console.log(`\n👤 User: ${msg.content}`);
    } else if (msg.role === 'assistant') {
      if (msg.tool_calls) {
        for (const call of msg.tool_calls) {
          const args = JSON.stringify(JSON.parse(call.function.arguments), null, 2);
          console.log(`🤖 Assistant invoked agent: ${call.function.name} with arguments:\n${args}`);
        }
      } else {
        console.log(`🤖 Assistant: ${msg.content}`);
      }
    } else if (msg.role === 'tool') {
      console.log(`🛠️ Tool response: ${msg.content}`);
    } else {
      console.log(`📄 ${msg.role}: ${msg.content}`);
    }
  }

  console.log('\n✅ Conversation finished.\n');
}

export function getFinalAnswer(messages) {
  return [...messages]
    .reverse()
    .find(m => m.role === 'assistant' && m.content)?.content || null;
}

export {
  Agent,
  Swarm,
  convertFunctionToJsonSchema
};
