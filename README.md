# nodejs-swarm-openai

**nodejs-swarm-openai** is an experimental Node.js SDK for orchestrating multi-agent conversations using OpenAI's models (GPT-4o, GPT-4, GPT-3.5). This library is a custom test implementation built from scratch, featuring support for finalizer agents, async tools, and improved error handling. It is intended for learning, prototyping, and exploring the principles behind Swarm-like coordination.

## ✅ NPM
- 📦 [View on npm](https://www.npmjs.com/package/nodejs-swarm-openai)

---

## ✅ Features

- ✨ Orchestrates multiple agents (chatbots) with distinct roles and instructions.
- 🔁 Automatic tool call handling via OpenAI function calling.
- 🧠 Optional finalizer agent to generate a unified final message.
- 🔧 Supports async tool functions (e.g., DB queries).
- 🐛 Safe internal error handling (errors never leak to user).
- 🧪 Built-in debug mode for developer insight.
- 🌐 Proxy support.

---

## 🔧 Installation

```bash
npm install nodejs-swarm-openai
```

## 📦 Usage

```js
import { Agent, Swarm, printMessagesPretty, getFinalAnswer } from 'nodejs-swarm-openai';

const needsAnalyst = new Agent({
  name: 'needs_analyst',
  description: 'Understands customer needs',
  instructions: 'Identify what matters most to the customer: budget, quality, speed, etc.',
  model: 'gpt-4o',
  tools: []
});

const positioningAgent = new Agent({
  name: 'positioning',
  description: 'Describes company strengths',
  instructions: 'Mention experience, materials, guarantees, and successful projects.',
  model: 'gpt-4o',
  tools: []
});

const sellerAgent = new Agent({
  name: 'seller',
  description: 'Invites to action',
  instructions: 'Encourage user to leave a phone number or schedule a call.',
  model: 'gpt-4o',
  tools: []
});

const routerAgent = new Agent({
  name: 'manager',
  description: 'Manages tasks and delegates to agents',
  instructions: `
You are a Swarm manager. Given a customer request, decide which agent to invoke:

- needs_analyst — to analyze customer needs;
- positioning — to describe the company;
- seller — to invite to next step.

Always respond with tool_call only. Never reply directly.`,
  model: 'gpt-4o'
});

const swarm = new Swarm(process.env.OPENAI_API_KEY, {
  proxyUrl: process.env.PROXY_GPT // Optional proxy support
});

(async () => {
  const { messages } = await swarm.run({
    routerAgent,
    agents: [needsAnalyst, positioningAgent, sellerAgent],
    finalizerAgent: new Agent({ //Optional
    name: 'my_finalizer',
    description: 'Custom summary',
    instructions: 'Merge replies into 1 final answer. Use polite tone.',
    model: 'gpt-4o',
    tools: []
  }),
    messages: [
      { role: 'user', content: 'I want a cheap and high-quality wooden sauna' }
    ],
    maxTurns: 5,
    debug: true // Optional
  });

  printMessagesPretty(messages);
  const final = getFinalAnswer(messages);
  console.log('\nFinal Answer:\n', final || 'No final message.');
})();
```

## ✅ Use Cases

- Multi-step sales dialogs
- Lead qualification
- Information extraction and synthesis
- Decision trees based on roles

## 🛠 Advanced

### Finalizer agent
By default, the library adds a final agent to summarize all assistant replies into one. You can override it:

```js
const swarm = new Swarm(apiKey);
swarm.run({
  finalizerAgent: new Agent({
    name: 'my_finalizer',
    description: 'Custom summary',
    instructions: 'Merge replies into 1 final answer. Use polite tone.',
    model: 'gpt-4o',
    tools: []
  }),
  ...
});
```

### Proxy
Pass a proxy URL using `proxyUrl` option:

```js
const swarm = new Swarm(apiKey, {
  proxyUrl: 'http://127.0.0.1:8080'
});
```

This SDK is part of **[Neurounit AI](https://neurounit.ai)** — my personal platform that helps businesses leverage artificial intelligence for **automated lead generation**.  
I develop this project in my spare time.


## 💜 Support

If you'd like to support this project, you can:

- Donate via TRC20: `TBJWkKyrQEmG1dr8rd3psDwWY4tEvUFnzw`
- Mention it on social media 🙌
- Star ⭐ the repo to show appreciation


