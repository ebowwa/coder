#!/usr/bin/env bun
/**
 * Test script for composable prompt architecture
 */

import { GLMClient } from "../src/lib/ai/client.js"
import { PromptBuilder, PromptTemplate, PromptStrategy, PROMPTS } from "../src/lib/ai/prompts.js";
import type { GLMModel } from "../src/lib/ai/types.js";

const API_KEY = process.env.Z_AI_API_KEY || process.env.ZAI_API_KEY || process.env.GLM_API_KEY

if (!API_KEY) {
  console.error('❌ API key not set')
  process.exit(1)
}

const client = new GLMClient(API_KEY)

async function testPromptBuilder() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 Test 1: PromptBuilder Fluent API')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const prompt = new PromptBuilder()
    .system('Hetzner server expert', ['Be concise', 'Use technical terms'])
    .context({ serverName: 'prod-web-01', cpu: '85%', memory: '72%' })
    .constraints('Keep under 50 words', 'Be actionable')
    .task('Assess server health and provide one recommendation.')
    .build()

  console.log('📝 Generated prompt:')
  console.log('---')
  console.log(prompt)
  console.log('---\n')
}

async function testPromptTemplate() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 Test 2: PromptTemplate Variable Interpolation')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const template = PromptTemplate.from(`
Server: {{name}}
Status: {{status}}
Action: {{action}}
  `)

  const rendered = template.render({
    name: 'prod-db-01',
    status: 'CRITICAL',
    action: 'Scale up immediately'
  })

  console.log('📝 Rendered template:')
  console.log('---')
  console.log(rendered)
  console.log('---\n')
}

async function testPromptStrategy() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 Test 3: PromptStrategy Patterns')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const zeroShot = PromptStrategy.zeroShot('What is 2+2?')
  const fewShot = PromptStrategy.fewShot('Complete the pattern', [
    { input: '1, 2, 3', output: '4' },
    { input: '2, 4, 6', output: '8' }
  ])
  const cot = PromptStrategy.chainOfThought('If 3 people can build 2 houses in 4 days, how many days for 6 people to build 8 houses?')

  console.log('📝 Zero-shot:')
  console.log('---')
  console.log(zeroShot)
  console.log('---\n')

  console.log('📝 Few-shot:')
  console.log('---')
  console.log(fewShot)
  console.log('---\n')

  console.log('📝 Chain-of-thought:')
  console.log('---')
  console.log(cot)
  console.log('---\n')
}

async function testPrebuiltPrompts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 Test 4: Pre-built PROMPTS (Refactored)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const serverName = PROMPTS.generateServerName('webapp', 'Next.js API')
  const analysis = PROMPTS.analyzeResources(85, 72, 45, ['22/tcp', '80/tcp', '443/tcp'])
  const sshHelp = PROMPTS.sshTroubleshoot('Connection refused')

  console.log('📝 generateServerName:')
  console.log('---')
  console.log(serverName.substring(0, 200) + '...')
  console.log('---\n')

  console.log('📝 analyzeResources:')
  console.log('---')
  console.log(analysis.substring(0, 300) + '...')
  console.log('---\n')

  console.log('📝 sshTroubleshoot:')
  console.log('---')
  console.log(sshHelp.substring(0, 200) + '...')
  console.log('---\n')
}

async function testLiveAI() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 Test 5: Live AI Response with Composable Prompt')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const prompt = new PromptBuilder()
    .system('concise server analyst')
    .context({ cpu: '92%', memory: '88%', disk: '35%' })
    .examples([
      { input: 'CPU: 95%, Memory: 90%', output: 'CRITICAL: Scale immediately' }
    ])
    .constraints('One sentence only', 'Start with status')
    .task('Assess this server health.')
    .build()

  console.log('📝 Prompt sent to AI:')
  console.log('---')
  console.log(prompt.substring(0, 300) + '...')
  console.log('---\n')

  const response = await client.generate(prompt, { model: 'GLM-4.5-air', temperature: 0.5 })

  console.log('🤖 AI Response:')
  console.log('---')
  console.log(response)
  console.log('---\n')
}

async function runAllTests() {
  console.log('\n🚀 Testing Composable Prompt Architecture\n')

  await testPromptBuilder()
  await testPromptTemplate()
  await testPromptStrategy()
  await testPrebuiltPrompts()
  await testLiveAI()

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ All prompt architecture tests complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

await runAllTests()
