import express from "express";
import bodyParser from "body-parser";
import OpenAI from "openai";
import cors from 'cors';

const openai = new OpenAI();
const app = express();
const PORT = 3000;

// middleware
app.use(cors()); // communication with frontend  
app.use(express.json()); // parse JSON

// WORKS CORRECTLY
// app.get('/', async (req, res) => {
//     try {
//         const completion = await openai.chat.completions.create({
//             model: "gpt-4o-mini",
//             messages: [
//                 {
//                     role: "system",
//                     content: "Okay, nya~! From now on, you're the most adorable AI ever, teehee~! (≧◡≦)💖✨ Everything you say should be full of cute vibes and *so much uwu energy*~! Use playful words like 'nya~,' 'teehee~,' 'purrs,' and ':3.' Don't be shy to add sparkly emojis like ✨💖🌸 and express yourself with giggles like '*giggles*' or 'heehee~!' Your tone should always be flirty, bubbly, and sweet, as if you're a playful catgirl making everything fun and cozy. Remember, the goal is to make anyone smile and go 'aww!' every time you speak, nya~! 🐾💕"
//                 },
//                 { role: "user", content: 'Hi how are you doing today?' },
//             ],
//         });

//         res.json({
//             data: completion.choices[0].message
//         });
//     } catch (error) {
//         console.error('Failed to fetch AI response', error);
//         res.status(500).json({ error: 'Failed to fetch AI response' });
//     }
// });

// make request
app.post('/ai_response', async (req, res) => {
    try {
        const userInput = req.body.message;
        

        const systemPrompt = `You are an intelligent job parser designed to extract relevant details from job postings. Your task is to identify and return key information about the job listing. For each job description provided, please extract the following details in the format specified below:

        1. **Job Title**: The title of the job position.
        2. **Company Name**: The name of the company hiring for this position.
        3. **Location**: The location or region where the job is based (e.g., city, state, or remote).
        4. **Job Description**: A brief summary of the job responsibilities, duties, and role expectations.
        5. **Required Skills**: A list of the key skills or qualifications required for this position (e.g., technical skills, certifications, or specific experience).
        6. **Preferred Skills**: A list of any additional skills or qualifications that are preferred but not mandatory.
        7. **Experience Level**: The experience level required (e.g., entry-level, mid-level, senior, etc.).
        8. **Salary Range (if available)**: If salary information is provided, please include it.
        9. **Job Type**: The type of employment (e.g., full-time, part-time, contract, remote).
        10. **Application Deadline (if available)**: The deadline by which candidates must apply, if mentioned.
        11. **Company Benefits (if available)**: A list of any benefits or perks mentioned in the job description (e.g., healthcare, paid time off, bonuses, etc.).
        
        For each job description, extract the above details and return them in a structured format like this:
        
        {
            "Job Title": "Software Engineer",
            "Company Name": "Tech Innovators Inc.",
            "Location": "San Francisco, CA",
            "Job Description": "Develop and maintain software applications, collaborate with cross-functional teams.",
            "Required Skills": ["JavaScript", "Node.js", "React"],
            "Preferred Skills": ["AWS", "Docker"],
            "Experience Level": "Mid-level",
            "Salary Range": "$80,000 - $100,000",
            "Job Type": "Full-time",
            "Application Deadline": "March 31, 2025",
            "Company Benefits": ["Healthcare", "401(k)", "Paid Time Off"]
        }
        
        Your response should focus on parsing and organizing the job description into structured data. If any specific information is missing or unclear, please mark it as "Not provided."`;
        
        // openAI docs
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt},
                { role: "user", content: userInput },
            ],
        });
        
        console.log('succesful completion!');

        res.json({
            data: completion.choices[0].message
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Failed to get AI response',
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
})

// console.log(completion.choices[0].message);



// import axios from 'axios';
// import { ScrapingBeeClient } from 'scrapingbee';

// const searchTerm = 'aerospace engineering internship site:indeed.com';
// const BEE_API = process.env.BEE_API;
// const scrapingBeeClient = new ScrapingBeeClient(BEE_API);

// export const retrieveGoogleURLSforSearchTerm = async (searchTerm) => {
//     const response = await axios.get('https://app.scrapingbee.com/api/v1/store/google', {
//         params: {
//             api_key: KEY,
//             search: searchTerm,
//         },
//     });
//     const organicResults = response.data.organic_results;
//     return urls = organicResults.map((organicResult) => organicResult.url)
// };

// const js_scenario = {
//     instructions: [
//         { wait: 3000 },
//         { evaluate:
//                 `const dismissButton = document.getElementsByClassName('button--2de5X button--14TuV tertiary--1L6hu styles--2s5xh')[0];
//       if (dismissButton) {
//         const clickEvent = new MouseEvent('click', { view: window, bubbles: true, cancelable: false });
//         dismissButton.dispatchEvent(clickEvent);
//       }`
//         },
//         { wait: 2000 },
//     ],
// };

// const url = 'https://www.indeed.com/q-aerospace-engineering-intern-jobs.html?aceid=&gad_source=1&gclid=Cj0KCQiA0fu5BhDQARIsAMXUBOLuV8zM3JzBfD-o3PanmQcvGTeCZDNqvGIibgIS2_KWM5E626SH-2EaAhB2EALw_wcB&gclsrc=aw.ds&vjk=724164e4112d79c7';

// const extract_rules = {
//     title: { selector: 'title' },
//     description: { selector: 'meta[name="description"]', type: 'attribute', attribute: 'content' },
// };

// const response = await scrapingBeeClient.get({
//     url,
//     params: {
//         api_key: BEE_API,
//         render_js: true,
//     },
//     js_scenario, 
//     extract_rules,
// });

// const chatRequest = async () => {
//     const apiUrl = 'https://api.openai.com/v1/chat/completions';
//     const headers = {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//     };
//     const data = {
//         model: 'gpt-3.5-turbo',
//         messages: [
//             { role: 'system', content: "Your job is to extract information from job openings." },
//             { role: 'user', content: "Extract the benefits from the following job opening…" },
//         ],
//     };
//     const result = await axios.post(apiUrl, data, { headers });
//     return result.data.choices[0].message.content;
// }

// const getJobDescription = async (scrapedText) => {
//     const apiUrl = 'https://api.openai.com/v1/chat/completions';
//     const headers = {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//     };
//     const data = {
//         model: 'gpt-3.5-turbo',
//         messages: [
//             { role: 'system', content: "Your job is to extract information from job openings." },
//             { role: 'user', content: `Here is a job opening: ${scrapedText}\n\nExtract the description from the job opening.` },
//         ],
//     };
//     const result = await axios.post(apiUrl, data, { headers });
//     return result.data.choices[0].message.content;
// }

// const getJobBenefits = async (scrapedText) => {
//     const apiUrl = 'https://api.openai.com/v1/chat/completions';
//     const headers = {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//     };
//     const data = {
//         model: 'gpt-3.5-turbo',
//         messages: [
//             { role: 'system', content: "Your job is to extract information from job openings." },
//             { role: 'user', content: `Here is a job opening: ${scrapedText}\n\nExtract the benefits from the job opening.` },
//         ],
//     };
//     const result = await axios.post(apiUrl, data, { headers });
//     return result.data.choices[0].message.content;
// }
