'use client'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

const ANTHROPIC_API_KEY = 'YOUR KEY HERE'; // Replace with your Anthropic API key
const SERP_API_KEY = 'YOUR KEY HERE'; // Replace with your SERP API key

function removeFirstLine(testString: string): string {
  if (testString.startsWith('Here') && testString.split('\n')[0].trim().endsWith(':')) {
    return testString.replace(/^.*\n/, '');
  }
  return testString;
}

async function generateText(
  prompt: string,
  model = 'claude-3-haiku-20240307',
  maxTokens = 2000,
  temperature = 0.7
): Promise<string> {
  const headers: AxiosRequestConfig['headers'] = {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };

  const data = {
    model,
    max_tokens: maxTokens,
    temperature,
    system: 'You are a world-class researcher. Analyze the given information and generate a well-structured report.',
    messages: [{ role: 'user', content: prompt }],
  };

  const response: AxiosResponse = await axios.post('https://api.anthropic.com/v1/messages', data, { headers });
  console.log(response.data);
  const responseText = response.data.content[0].text;
  console.log(removeFirstLine(responseText.trim()));
  return removeFirstLine(responseText.trim());
}

async function searchWeb(searchTerm: string): Promise<any> {
  const url = `https://serpapi.com/search.json?q=${searchTerm}&api_key=${SERP_API_KEY}`;
  const response: AxiosResponse = await axios.get(url);
  console.log(response.data);
  return response.data;
}

async function generateSubtopicReport(subtopic: string): Promise<string> {
  const searchData: any[] = [];
  const allQueries: string[] = [];

  console.log(`Generating initial search queries for subtopic: ${subtopic}...`);
  const initialQueriesPrompt = `Generate 3 search queries to gather information on the subtopic '${subtopic}'. Return your queries in a TypeScript-parseable array. Return nothing but the array. Do so in one line. Start your response with [\"`;
  const initialQueries = (await generateText(initialQueriesPrompt)).split('[')[1].split(']')[0].split(',').map((q) => q.trim().slice(1, -1));
  console.log(initialQueries);
  allQueries.push(...initialQueries);

  for (let i = 0; i < 3; i++) {
    console.log(`Performing search round ${i + 1} for subtopic: ${subtopic}...`);
    for (const query of initialQueries) {
      const searchResults = await searchWeb(query);
      searchData.push(searchResults);
    }

    console.log(`Generating additional search queries for subtopic: ${subtopic}...`);
    const additionalQueriesPrompt = `Here are the search results so far for the subtopic '${subtopic}':\n\n${JSON.stringify(searchData)}\n\n---\n\nHere are all the search queries you have used so far for this subtopic:\n\n${JSON.stringify(allQueries)}\n\n---\n\nBased on the search results and previous queries, generate 3 new and unique search queries to expand the knowledge on the subtopic '${subtopic}'. Return your queries in a TypeScript-parseable array. Return nothing but the array. Do so in one line. Start your response with [\"`;
    const additionalQueries = (await generateText(additionalQueriesPrompt)).split('[')[1].split(']')[0].split(',').map((q) => q.trim().slice(1, -1));
    initialQueries.splice(0, initialQueries.length, ...additionalQueries);
    allQueries.push(...additionalQueries);
  }

  console.log(`Generating initial report for subtopic: ${subtopic}...`);
  const reportPrompt = `When writing your report, make it incredibly detailed, thorough, specific, and well-structured. Use Markdown for formatting. Analyze the following search data and generate a comprehensive report on the subtopic '${subtopic}':\n\n${JSON.stringify(searchData)}`;
  let report = await generateText(reportPrompt, 'claude-3-opus-20240229', 4000);

  for (let i = 0; i < 3; i++) {
    console.log(`Analyzing report and generating additional searches (Round ${i + 1}) for subtopic: ${subtopic}...`);
    const analysisPrompt = `Analyze the following report on the subtopic '${subtopic}' and identify areas that need more detail or further information:\n\n${report}\n\n---\n\nHere are all the search queries you have used so far for this subtopic:\n\n${JSON.stringify(allQueries)}\n\n---\n\nGenerate 3 new and unique search queries to fill in the gaps and provide more detail on the identified areas. Return your queries in a TypeScript-parseable array. Return nothing but the array. Do so in one line. Start your response with [\"`;
    const additionalQueries = (await generateText(analysisPrompt)).split('[')[1].split(']')[0].split(',').map((q) => q.trim().slice(1, -1));
    allQueries.push(...additionalQueries);

    const roundSearchData: any[] = [];
    for (const query of additionalQueries) {
      const searchResults = await searchWeb(query);
      roundSearchData.push(searchResults);
    }

    console.log(`Updating report with additional information (Round ${i + 1}) for subtopic: ${subtopic}...`);
    const updatePrompt = `Update the following report on the subtopic '${subtopic}' by incorporating the new information from the additional searches. Keep all existing information... only add new information:\n\n${report}\n\n---\n\nAdditional search data for this round:\n\n${JSON.stringify(roundSearchData)}\n\n---\n\nGenerate an updated report that includes the new information and provides more detail in the identified areas. Use Markdown for formatting.`;
    report = await generateText(updatePrompt, 'claude-3-opus-20240229', 4000);
  }

  console.log(`Generating boss feedback for subtopic: ${subtopic}...`);
  const feedbackPrompt = `Imagine you are the boss reviewing the following report on the subtopic '${subtopic}':\n\n${report}\n\n---\n\nProvide constructive feedback on what information is missing or needs further elaboration in the report. Be specific and detailed in your feedback.`;
  const feedback = await generateText(feedbackPrompt, 'claude-3-opus-20240229', 1000);

  console.log(`Generating final round of searches based on feedback for subtopic: ${subtopic}...`);
  const finalQueriesPrompt = `Based on the following feedback from the boss regarding the subtopic '${subtopic}':\n\n${feedback}\n\n---\n\nGenerate 3 search queries to find the missing information and address the areas that need further elaboration. Return your queries in a TypeScript-parseable array. Return nothing but the array. Do so in one line. Start your response with [\"`;
  const finalQueries = (await generateText(finalQueriesPrompt)).split('[')[1].split(']')[0].split(',').map((q) => q.trim().slice(1, -1));
  allQueries.push(...finalQueries);

  const finalSearchData: any[] = [];
  for (const query of finalQueries) {
    const searchResults = await searchWeb(query);
    finalSearchData.push(searchResults);
  }

  console.log(`Updating report with final information for subtopic: ${subtopic}...`);
  const finalUpdatePrompt = `Update the following report on the subtopic '${subtopic}' by incorporating the new information from the final round of searches based on the boss's feedback:\n\n${report}\n\n---\n\nFinal search data:\n\n${JSON.stringify(finalSearchData)}\n\n---\n\nGenerate the final report that addresses the boss's feedback and includes the missing information. Use Markdown for formatting.`;
  const finalReport = await generateText(finalUpdatePrompt, 'claude-3-opus-20240229', 4000);

  console.log(`Final report generated for subtopic: ${subtopic}!`);
  return finalReport;
}

async function generateComprehensiveReport(topic: string, subtopicReports: string): Promise<string> {
  console.log('Generating comprehensive report...');
  const comprehensiveReportPrompt = `Generate a comprehensive report on the topic '${topic}' by combining the following reports on various subtopics:\n\n${subtopicReports}\n\n---\n\nEnsure that the final report is well-structured, coherent, and covers all the important aspects of the topic. Make sure that it includes EVERYTHING in each of the reports, in a better structured, more info-heavy manner. Nothing -- absolutely nothing, should be left out. If you forget to include ANYTHING from any of the previous reports, you will face the consequences. Include a table of contents. Leave nothing out. Use Markdown for formatting.`;
  const comprehensiveReport = await generateText(comprehensiveReportPrompt, 'claude-3-opus-20240229', 4000);

  console.log('Comprehensive report generated!');
  return comprehensiveReport;
}

// User input
const researchTopic = prompt('Enter the research topic:');

// Generate subtopic checklist
const subtopicChecklistPrompt = `Generate a detailed checklist of subtopics to research for the topic '${researchTopic}'. Return your checklist in a TypeScript-parseable array. Return nothing but the array. Do so in one line. Maximum five sub-topics. Start your response with [\"`;
const subtopicChecklist = (await generateText(subtopicChecklistPrompt)).split('[')[1].split(']')[0].split(',').map((t) => t.trim().slice(1, -1));
console.log(`Subtopic Checklist: ${subtopicChecklist}`);

// Generate reports for each subtopic
const subtopicReports: string[] = [];
for (const subtopic of subtopicChecklist) {
  const subtopicReport = await generateSubtopicReport(subtopic);
  subtopicReports.push(subtopicReport);
}

// Combine subtopic reports into a comprehensive report
const comprehensiveReport = await generateComprehensiveReport(researchTopic, subtopicReports.join('\n\n'));

// Save the comprehensive report to a file
await Deno.writeTextFile('comprehensive_report.txt', comprehensiveReport);

console.log('Comprehensive report saved as \'comprehensive_report.txt\'.');

