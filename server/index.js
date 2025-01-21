import express from "express";
import OpenAI from "openai";
import cors from 'cors';
import scrapingbee from "scrapingbee";
import { MongoClient, ServerApiVersion } from 'mongodb'; 
import 'dotenv/config';
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const openai = new OpenAI();
const client = new scrapingbee.ScrapingBeeClient(process.env.BEE_API); 
const app = express();
const uri = `mongodb+srv://ohmrajpal:${process.env.DB_PASSWORD}@cluster0.5pxx9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`; 
const mongoClient = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true, }});
const PORT = 3000;

// temporary data from JSON delete later
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory
const jsonPath = path.join(__dirname, 'data.json');
let jsonData = null;

// debugging: read the file
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

// connect mongodb client
async function runDatabase() {
    try {
        await mongoClient.connect();
        await mongoClient.db("newspaceDB").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (e) {
        console.log(`error ${e}`);
    }
}

// currently used for debugging but useful to close connection after singular get request of webscraper
async function closeDatabase() {
    try {
        await mongoClient.close();
        console.log("Closed MongoDB connection!");
    } catch (e) {
        console.log(`error ${e}`);
    }
}

runDatabase().catch(console.dir);

// randomly select count numbers and store into array
function getRandomIndicies(arr, count) {
    const indicies = new Set();

    while (indicies.size < count) {
        indicies.add(Math.floor(Math.random() * 10));
    }

    return Array.from(indicies);
}

// modify so that all the urls get saved to the database
// access every url in main page
async function getUrls(url) {
    try {
        const urlData = await client.get({
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
              'country_code': 'us',
              'block_resources': 'False',
              'stealth_proxy': 'True' 
            },
        })
        console.log("Status Code:", urlData.status) 
        var decoder = new TextDecoder();
        var text = decoder.decode(urlData.data); 
        // console.log("Response content:", text);
        var jsonParsed = JSON.parse(text);
        console.log("Response content json form:", jsonParsed);
        return jsonParsed;
    } catch (e) {
        console.log('A problem occurs in scraping the website!');
        if (e.response) {
            console.error('Error Status:', e.response.status);
            console.error('Error Response Data:', e.response.data);
        } else {
            // For other errors like network issues
            console.error('Error Message:', e.message);
        }
    } 
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
              'ai_query': 'full job description',
              'ai_selector': '#jobDescriptionText'
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
}

// function to analyze scraped data
async function analyzePage(pageData) {
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

// debugging get requests by scraper
// app.get('/test_test', async (req, res) => {
//     console.log('begin scraping whole page test');
//     const data = await scrapeLink("https://www.indeed.com/viewjob?jk=425bf3c5e49ca25d");
//     console.log(`data is ${data}`);
// })

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
const jobUrl = 'https://www.indeed.com/jobs?q=aerospace+engineering+intern';
const indeed = "https://www.indeed.com";

app.get('/webscrape_jobs', async(req, res) => {
    try {
        // database
        const database = mongoClient.db("newspaceDB");
        const jobData = database.collection("jobData");

        // scrape urls
        const jsonData = await getUrls(jobUrl);
        // only save urls that contain keyword "Intern"
        console.log('about to go over each link')
        jsonData.all_links.forEach(link => {
            const anchor = link.anchor;
            const href = link.href;
    
            if (anchor.includes("Intern")) {
                validUrls.push(indeed + href);
                console.log(`url pushed: ${indeed + href}`);
            }
        });

        // select four random jobs from the top tne links
        randomIndicies = await getRandomIndicies(validUrls, 4);
        // iterate over each index
        randomIndicies.forEach(async index => {
            console.log(`random index ${index} and corresponding link ${validUrls[index]}`);
            const scrapedLinkData = await scrapeLink(validUrls[index]);        
            const analyzedData = await analyzePage(encodeURIComponent(scrapedLinkData));
            
            scrapedDataArr.push(scrapedLinkData);
            analyzedDataArr.push(analyzedData);

            const doc = {
                indexNum: index,
                urlUsed: validUrls[index],
                analyzedData: analyzedData
            }
            // store results in db
            const result = await jobData.insertOne(doc);
            console.log(`Successfully scraped data! Final result ${result}`);
        });
    } catch (e) {
        console.log(`error ${e}`);
    } finally {
        closeDatabase();
    }
})

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
}) 