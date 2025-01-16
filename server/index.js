import express from "express";
import OpenAI from "openai";
import cors from 'cors';
import playwright from 'playwright';
import scrapingbee from "scrapingbee";
import 'dotenv/config';

const openai = new OpenAI();
const app = express();
const PORT = 3000;

// middleware
app.use(cors()); // communication with frontend  
app.use(express.json()); // parse JSON

// next step is to click through every job posting that is an aerospace internship
// extract the string data in that job posting
// feed the data to the LLM and get a clean response back
// iterate this process for all the jobs in the first page
// later steps include creating a nicer frontend that cleanly displays all of the scraped jobs
// last steps would involve choosing a job updating frequency, and figuring out how/where to host this website

// test out playwright's scraping functionality
app.get('/scrape_test', async(req, res) => {
    console.log('Starting scraping');
    try {
        for (const browserType of ['chromium', 'firefox', 'webkit']) {  
            const browser = await playwright[browserType].launch();
            const context = await browser.newContext();
            const page = await context.newPage();
            await page.goto("https://www.indeed.com/jobs?q=aerospace+engineering+intern");
            await page.screenshot({path: `nodejs_${browserType}.png`, fullPage: true});
            await page.waitForTimeout(1000);
            await browser.close();
            console.log(`API called successfully for browser ${browserType}`);
        }
    } catch (e) {
        console.log("FAILED TO SCRAPE within backend");
        console.log(`ERROR IS ${e}`);
    }
    console.log('Finished scraping');
})


// test out scraping bee
async function get(url) {
    var client = new scrapingbee.ScrapingBeeClient(process.env.BEE_API); 
    return await client.get({
      url: url,
      params: {
        'render_js': 'True',
        // 'stealth_mode': 'True',
        'country_code': 'us',
        'block_resources': 'False',
        'stealth_proxy': 'True'
      },
    })
  }

app.get('/scrape_test_two', async(req, res) => {
    const url = 'https://www.indeed.com/jobs?q=aerospace+engineering+intern';
    const my_request = get(url);
    my_request.then(function (response) {
        console.log("Status Code:", response.status) // Print request status code
        var decoder = new TextDecoder();
        var text = decoder.decode(response.data); // Decode request content
        console.log("Response content:", text); // Print the content
        res.send(text);
        console.log("FINISHED SUCCESSFULLY!!");
    }).catch((e) => console.log('A problem occurs : ' + e.response.data));
})

// this will parse the web scraped input eventually
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