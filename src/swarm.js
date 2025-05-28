import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Agent } from './agent.js';

export class Swarm {
  constructor(apiKey, options = {}) {
    const config = { apiKey };

    if (options.proxyUrl) {
      config.httpAgent = new HttpsProxyAgent(options.proxyUrl);
    }

    this.client = new OpenAI(config);
  }

  async run({
    agents = [],
    routerAgent = null,
    finalizerAgent = null,
    messages = [],
    maxTurns = 10,
    debug = false
  }) {
    if (!agents.length) throw new Error('No agents provided');

    const agentMap = Object.fromEntries(agents.map(agent => [agent.name, agent]));
    const toolSchemas = agents.map(a => a.toolSchema);

    const finalizer = finalizerAgent || new Agent({
      name: 'finalizer',
      description: 'Generates the final response based on messages from other agents',
      instructions: `You receive all messages from the agents (needs, positioning, sales) and combine them into a single polite and persuasive message for the client. Write as a human salesperson would. Do not mention that you are an AI. Avoid using the client's name unless it was explicitly provided, and do not include phrases like "Sincerely, [Your Name]" if you don't know your own name.`,
      model: 'gpt-4o',
      tools: []
    });


    let turns = 0;
    let currentMessages = [
      ...(routerAgent ? [{ role: 'system', content: routerAgent.instructions }] : []),
      ...messages
    ];

    const assistantReplies = [];

    while (turns < maxTurns) {
      const response = await this.client.chat.completions.create({
        model: routerAgent ? routerAgent.model : agents[0].model,
        messages: currentMessages,
        tools: toolSchemas,
        tool_choice: 'auto'
      });

      const msg = response.choices[0].message;
      if (debug) console.log('[MODEL]', msg);
      currentMessages.push(msg);

      if (msg.tool_calls) {
        const toolResponses = msg.tool_calls.map(call => ({
          role: 'tool',
          tool_call_id: call.id,
          content: `Calling agent: ${call.function.name}`
        }));

        if (debug) console.log('[TOOL RESPONSES]', toolResponses);
        currentMessages.push(...toolResponses);

        for (const call of msg.tool_calls) {
          const agentName = call.function.name;
          const agent = agentMap[agentName];
          if (!agent) throw new Error(`Unknown agent: ${agentName}`);

          const input = JSON.parse(call.function.arguments).input;

          const nestedResponse = await this.client.chat.completions.create({
            model: agent.model,
            messages: [
              { role: 'system', content: agent.instructions },
              ...currentMessages,
              { role: 'user', content: input }
            ],
            tools: agent.jsonSchemaTools,
            tool_choice: 'auto'
          });

          const agentMsg = nestedResponse.choices[0].message;
          if (debug) console.log(`[AGENT RESPONSE: ${agentName}]`, agentMsg);
          currentMessages.push(agentMsg);

          if (agentMsg.tool_calls) {
            for (const toolCall of agentMsg.tool_calls) {
              const toolName = toolCall.function.name;
              const args = JSON.parse(toolCall.function.arguments);
              const toolFn = agent.tools.find(t => t.name === toolName);

              try {
                const result = toolFn
                  ? await toolFn(...Object.values(args))
                  : `Calling agent: ${toolName}`;

                if (debug) console.log(`[TOOL EXEC: ${toolName}]`, result);

                currentMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: result.toString()
                });
              } catch (err) {
                if (debug) console.error(`[TOOL ERROR: ${toolName}]`, err);

                currentMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: 'An internal error occurred. Please try again later.'
                });
              }
            }
          }

          if (agentMsg.content) assistantReplies.push(agentMsg.content);
        }
      } else {
        if (msg.content) assistantReplies.push(msg.content);
        break;
      }

      turns++;
    }

    if (assistantReplies.length > 0 && finalizer) {
      const combined = assistantReplies.join('\n\n');

      const finalResponse = await this.client.chat.completions.create({
        model: finalizer.model,
        messages: [
          { role: 'system', content: finalizer.instructions },
          { role: 'user', content: combined }
        ]
      });

      const finalMessage = finalResponse.choices[0].message;
      if (debug) console.log('[FINALIZER]', finalMessage);

      currentMessages.push(finalMessage);
    }

    return { messages: currentMessages };
  }
}

