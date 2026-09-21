const texts = [
  // 1. Markdown block
  `\`\`\`json\n{"event_ready": true, "event_data": {"title": "Test"}}\n\`\`\``,
  // 2. Trailing characters after }
  `{"event_ready": true, "event_data": {"title": "Test"}} trailing garbage`,
  // 3. Leading and trailing garbage
  `Here is JSON: {"event_ready": true, "event_data": {"title": "Test"}} have fun`,
  // 4. Nested braces
  `{"event_ready": true, "event_data": {"title": "Test", "tiers": [{ "capacity": 150 }] }}`
];

for (let i = 0; i < texts.length; i++) {
  const text = texts[i];
  console.log(`\n--- Test ${i+1} ---`);
  let parsedJson = null;
  try {
    if (text.includes('"event_ready":')) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedJson = JSON.parse(jsonMatch[0]);
        console.log("SUCCESS:", parsedJson.event_data.title);
      }
    }
  } catch (e) {
    console.error("FAILED to parse:", e.message);
    console.log("Matched text was:", text.match(/\{[\s\S]*\}/)[0]);
  }
}
