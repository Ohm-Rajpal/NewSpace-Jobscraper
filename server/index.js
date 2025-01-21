import express from "express";
import OpenAI from "openai";
import cors from 'cors';
import playwright from 'playwright';
import scrapingbee from "scrapingbee";
import 'dotenv/config';
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const openai = new OpenAI();
const client = new scrapingbee.ScrapingBeeClient(process.env.BEE_API); 
const app = express();
const PORT = 3000;

// temporary data from JSON delete later
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory
const jsonPath = path.join(__dirname, 'data.json');
let jsonData = null;

fs.readFile(jsonPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading JSON file:', err);
      return;
    }
  
    // Parse the JSON data
    try {
      jsonData = JSON.parse(data);
  
      // Now you have the JSON data in memory
    //   console.log('JSON Data:', jsonData);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
    }
  });

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

// access every url in main page
async function get_urls(url) {
    return await client.get({
      url: url,
      params: {
        'extract_rules': {"all_links" : {
            "selector": "a",
            "type": "list",
            "output": {
                "anchor": "a",
                "href": {
                    "selector": "a",
                    "output": "@href"
                }
            }
        }},
        // 'render_js': 'True',
        'country_code': 'us',
        'block_resources': 'False',
        'stealth_proxy': 'True' 
      },
    })
}

// randomly select count numbers and store into array
function getRandomIndicies(arr, count) {
    const indicies = new Set();

    while (indicies.size < count) {
        indicies.add(Math.floor(Math.random() * 10));
    }

    return Array.from(indicies);
}

async function scrapeLink(target_url) {

    // uncomment when you need to test individual link scraping functionality:
    try {
        const scrapePage = await client.get({
            url: target_url,
            params: {
              'country_code': 'us',
              'block_resources': 'False',
              'stealth_proxy': 'True',
              'wait': '10000',
              'wait_browser': 'load',
            },
        });
        console.log("Status Code:", scrapePage.status) 
        var decoder = new TextDecoder();
        var text = decoder.decode(scrapePage.data); 
        console.log("Response content:", text);
        return text;
    } catch (e) {
        console.log('A problem occurs in scraping the link!');
        
        if (e.response) {
            console.error('Error Status:', e.response.status);
            console.error('Error Response Data:', e.response.data);
        } else {
            // For other errors like network issues
            console.error('Error Message:', e.message);
        }
    }
    // const scrapePage = 'scraping function call (expensive)';
}

// app.get('/test_test', async (req, res) => {
//     console.log('begin scraping whole page test');
//     const data = await scrapeLink("https://www.indeed.com/viewjob?jk=425bf3c5e49ca25d");
//     console.log(`data is ${data}`);
// })

async function analyze_page(pageData) {
    // call openai api to analyze the page
    // we will save this result too    
    try {
        const userInput = String(pageData);
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
        console.log('AI analysis succesfully complete!');
        return completion.choices[0].message.content;
    } catch (error) {
        const errorMessage = "analysis did not work correctly";
        console.error('Failed to call OpenAI API:', error);
        return errorMessage;
    }
}

// modify this code to save the data in a database tool
// for now i have copied and pasted the data in a json
// iterate over the json and extract the links
// call a different scraper get request to get the information on the page
// afterwards call an LLM to analyze the results and format it in a nice way

// go over every anchor link that has the word "intern" in it
// create an array that holds the link to every one of the
// https://www.indeed.com/
const validUrls = [];
let randomIndicies = [];
const scrapedDataArr = [];
const analyzedDataArr = [];

app.get('/webscrape_jobs', async(req, res) => {
    const url = 'https://www.indeed.com/jobs?q=aerospace+engineering+intern';
    const indeed = "https://www.indeed.com";
    // const url = "https://www.amazon.com/s?k=computer&crid=18YBFCB2WXF5C&sprefix=comput%2Caps%2C168&ref=nb_sb_noss_2";
    // const url = "https://www.indeed.com/jobs/q-aerospace%20engineering%20intern?vjk=b498d310e453438b";

    // uncomment when ready -> for now just use the json data in data.json
    // const json_urls = await get_urls(url);
    
    // json_urls.then(function (response) {
    //     console.log("Status Code:", response.status) 
    //     var decoder = new TextDecoder();
    //     var text = decoder.decode(response.data); 
    //     console.log("Response content:", text);
    //     res.send(text);
    //     console.log("FINISHED SUCCESSFULLY!!");
    // }).catch((e) => console.log('A problem occurs : ' + e.response.data));
    
    // iterate over the json urls
    jsonData.all_links.forEach(link => {
        const anchor = link.anchor;
        const href = link.href;

        if (anchor.includes("Intern")) {
            validUrls.push(indeed + href);
            console.log(`url pushed: ${indeed + href}`);
        }
    });

    // change of plans select random top 10
    randomIndicies = await getRandomIndicies(validUrls, 1); // for now we are only scraping 4 random indicies
    // debugging
    randomIndicies.forEach(async index => {
        console.log(`random index ${index} and corresponding link ${validUrls[index]}`);
        const scrapedLinkData = await scrapeLink(validUrls[index]);
        // const scrapedLinkData = `
        // <div class="scaffold-layout__row scaffold-layout__content scaffold-layout__content--list-detail">
        //   <div id="ember822" class="artdeco-entity-lockup__subtitle ember-view t-16">
        //     188,238 followers
        //   </div>
        //   <button class="follow artdeco-button artdeco-button--secondary ml5" aria-label="Follow" type="button">
        //     <svg role="none" aria-hidden="true" class="artdeco-button__icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        //       <use href="#add-small" width="16" height="16"></use>
        //     </svg>
        //     <span aria-hidden="true">Follow</span>
        //   </button>
        //   <div class="t-14 mt5">
        //     Automotive
        //     <span class="jobs-company__inline-information">1,001-5,000 employees</span>
        //     <span class="jobs-company__inline-information">3,624 on LinkedIn</span>
        //   </div>
        //   <p class="jobs-company__company-description text-body-small-open">
        //     <div class="YdPtnwmzOdftNXhdCxQDyenbgpZTnuEajNVEjFI inline-show-more-text--is-collapsed inline-show-more-text--is-collapsed-with-line-clamp" style="-webkit-line-clamp:3;" dir="ltr" tabindex="-1">
        //       Zoox is transforming mobility-as-a-service by developing a fully autonomous, purpose-built fleet designed for AI to drive and humans to enjoy.
        //       <span class="inline-show-more-text__link-container-collapsed">
        //         <span>…</span>
        //         <button class="inline-show-more-text__button inline-show-more-text__button--light link" aria-expanded="false" role="button" type="button">
        //           show more
        //         </button>
        //       </span>
        //     </div>
        //   </p>
        // </div>
        // `;
        
        const analyzedData = await analyze_page(encodeURIComponent(scrapedLinkData));

        // want to store these results in a db
        scrapedDataArr.push(scrapedLinkData);
        analyzedDataArr.push(analyzedData);
        console.log(`random scraped link data: ${scrapedLinkData}`);
        console.log(`analyzed output is: ${analyzedData}`);
        console.log('Successfully scraped data!');
    });
    
    // console.log(`all internship urls ${validUrls}`);

    // now iterate over every link
    // now call openai api on all of the scraped link
})

// this will parse the web scraped input eventually
// modify this function so that it reads the information sent from a database of my choice and then calls the ai on each one
// app.post('/ai_response', async (req, res) => {
//     try {
//         const userInput = req.body.message;
//         const systemPrompt = `You are an intelligent job parser designed to extract relevant details from job postings. Your task is to identify and return key information about the job listing. For each job description provided, please extract the following details in the format specified below:

//         1. **Job Title**: The title of the job position.
//         2. **Company Name**: The name of the company hiring for this position.
//         3. **Location**: The location or region where the job is based (e.g., city, state, or remote).
//         4. **Job Description**: A brief summary of the job responsibilities, duties, and role expectations.
//         5. **Required Skills**: A list of the key skills or qualifications required for this position (e.g., technical skills, certifications, or specific experience).
//         6. **Preferred Skills**: A list of any additional skills or qualifications that are preferred but not mandatory.
//         7. **Experience Level**: The experience level required (e.g., entry-level, mid-level, senior, etc.).
//         8. **Salary Range (if available)**: If salary information is provided, please include it.
//         9. **Job Type**: The type of employment (e.g., full-time, part-time, contract, remote).
//         10. **Application Deadline (if available)**: The deadline by which candidates must apply, if mentioned.
//         11. **Company Benefits (if available)**: A list of any benefits or perks mentioned in the job description (e.g., healthcare, paid time off, bonuses, etc.).
        
//         For each job description, extract the above details and return them in a structured format like this:
        
//         {
//             "Job Title": "Software Engineer",
//             "Company Name": "Tech Innovators Inc.",
//             "Location": "San Francisco, CA",
//             "Job Description": "Develop and maintain software applications, collaborate with cross-functional teams.",
//             "Required Skills": ["JavaScript", "Node.js", "React"],
//             "Preferred Skills": ["AWS", "Docker"],
//             "Experience Level": "Mid-level",
//             "Salary Range": "$80,000 - $100,000",
//             "Job Type": "Full-time",
//             "Application Deadline": "March 31, 2025",
//             "Company Benefits": ["Healthcare", "401(k)", "Paid Time Off"]
//         }
        
//         Your response should focus on parsing and organizing the job description into structured data. If any specific information is missing or unclear, please mark it as "Not provided."`;
        
//         // openAI docs
//         const completion = await openai.chat.completions.create({
//             model: "gpt-4o-mini",
//             messages: [
//                 { role: "system", content: systemPrompt},
//                 { role: "user", content: userInput },
//             ],
//         });
        
//         console.log('succesful completion!');

//         res.json({
//             data: completion.choices[0].message
//         });

//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({
//             error: 'Failed to get AI response',
//             details: error.message
//         });
//     }
// });

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
}) 