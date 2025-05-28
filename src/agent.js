import { convertFunctionToJsonSchema } from './tool.js';

export class Agent {
  constructor({ name, description = '', instructions, model = 'gpt-4o', tools = [] }) {
    this.name = name;
    this.description = description;
    this.instructions = instructions;
    this.model = model;
    this.tools = tools;
    this.toolSchema = this.buildAgentToolSchema();
    this.jsonSchemaTools = this.convertToolsToJsonSchema();
  }

  buildAgentToolSchema() {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'Input for the agent'
            }
          },
          required: ['input']
        }
      }
    };
  }

  convertToolsToJsonSchema() {
    return this.tools.map(tool => {
      if (typeof tool === 'function') {
        return convertFunctionToJsonSchema(tool);
      } else if (typeof tool === 'object' && tool.function) {
        return tool;
      } else {
        throw new Error(`Invalid tool format: ${tool}`);
      }
    });
  }

  getOpenAIAgentSpec() {
    return {
      name: this.name,
      description: this.description,
      model: this.model,
      system_message: this.instructions,
      tools: this.jsonSchemaTools
    };
  }
}

