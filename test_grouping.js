// Simple test for groupMessagesByPromptContext
const { groupMessagesByPromptContext } = require('./src/renderer/src/components/message/utils.tsx');

// Mock messages
const messages = [
  { id: '1', type: 'user', content: 'Hello', promptContext: null },
  { id: '2', type: 'tool', content: 'Tool1', promptContext: { group: { id: 'group1' } } },
  { id: '3', type: 'tool', content: 'Tool2', promptContext: { group: { id: 'group1' } } },
  { id: '4', type: 'response', content: 'Response', promptContext: null },
  { id: '5', type: 'tool', content: 'Tool3', promptContext: { group: { id: 'group2' } } },
  { id: '6', type: 'user', content: 'World', promptContext: null },
];

const result = groupMessagesByPromptContext(messages);
console.log(result);