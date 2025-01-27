import express from "express";
import OpenAI from "openai";
import cors from 'cors';
import scrapingbee from "scrapingbee";
import { MongoClient, ServerApiVersion } from 'mongodb'; 
import 'dotenv/config';

const openai = new OpenAI();
const client = new scrapingbee.ScrapingBeeClient(process.env.BEE_API); 
const app = express();
const uri = `mongodb+srv://ohmrajpal:${process.env.DB_PASSWORD}@cluster0.5pxx9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`; 
const mongoClient = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true, }});
const PORT = 3000;

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
        const systemPrompt = `You are an intelligent job parser designed to extract and summarize critical details from internship postings. Your task is to generate a clear and concise paragraph describing the most important aspects of the internship. For each internship description provided:

        - Highlight the required and preferred technical skills as a top priority. If specific skills are not mentioned, infer likely skills based on the internship title and description. For aerospace engineering internships, consider mentioning CAD software (e.g., CATIA, SolidWorks), finite element analysis tools (e.g., ANSYS, NASTRAN), programming languages (e.g., MATLAB, Python), and knowledge of aerodynamics or propulsion systems.
        - Include the internship title, company name, location (or note if the internship is remote), and the year the internship is for (e.g., Summer 2025 Internship).
        - Provide a brief overview of the internship responsibilities and learning opportunities.
        - Mention any prerequisites like education level (e.g., junior or senior in aerospace engineering), GPA requirements, and any experience needed. If not stated, make reasonable assumptions.
        - Include details about the duration, type of internship (e.g., paid, full-time, part-time), and any other notable benefits or perks if available.
        
        Focus on delivering an easy-to-read, single-paragraph summary that emphasizes technical requirements and other critical details. For example:
        
        'AeroTech Dynamics is offering a Summer 2025 Aerospace Engineering Internship in Huntsville, AL, or remote. The role involves supporting the design and analysis of aerospace systems, requiring skills in CATIA for CAD, MATLAB for computational modeling, and a basic understanding of aerodynamics and propulsion systems. Ideal candidates are juniors or seniors in aerospace engineering with a GPA of 3.5 or higher. This full-time, paid internship provides hands-on experience with advanced aerospace tools, mentorship opportunities, and a potential pathway to full-time employment.'
        
        Your response should prioritize readability, conciseness, and accurately summarize the internship description, with a focus on skills and the year of the internship.`;
        
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

// go over every anchor link that has the word "intern" in it
// create an array that holds the link to every one of the
// https://www.indeed.com/
const validUrls = [];
// let randomIndicies = [];
const scrapedDataArr = [];
const analyzedDataArr = [];
const jobUrl = 'https://www.indeed.com/jobs?q=aerospace+engineering+intern';
const indeed = "https://www.indeed.com";

app.get('/webscrape_jobs', async(req, res) => {
    try {
        // database
        const database = mongoClient.db("newspaceDB");
        const urlDB = database.collection("urlData");
        const rawDB = database.collection("rawData");
        const jobData = database.collection("jobData");

        // 1. Scrape URLs
        const jsonData = await getUrls(jobUrl);
        console.log('about to go over each link'); // only save urls that contain keyword "Intern"
        jsonData.all_links.forEach(link => {
            const anchor = link.anchor;
            const href = link.href;
    
            if (anchor.includes("Intern")) {
                validUrls.push({currentLink: indeed + href});
                console.log(`url pushed: ${indeed + href}`);
            }
        });
        // save urls in the DB
        const insertLinks = await urlDB.insertMany(validUrls);
        console.log(`${insertLinks.insertedCount} documents were inserted`);

        // 2. Read URLs and scrape each of them
        const urlDBUrls = await urlDB.find().toArray();
        // send the top 4 for analysis
        for (let i = 0; i < 4; i+= 1) {
            const link = urlDBUrls[i].currentLink;
            const scrapedLinkData = await scrapeLink(link);
            scrapedDataArr.push({currentData: scrapedLinkData});
        }
        // save raw data in the DB
        const rawDataInserted = await rawDB.insertMany(scrapedDataArr);
        console.log(`${rawDataInserted.insertedCount} documents were inserted`);

        // READ THE data in the DB and analyze it and send that as the final parsed output 
        const rawData = await rawDB.find().toArray();
        
        for (let i = 0; i < 4; i+= 1) {
            const rawDataEntry = rawData[i].currentData;
            const analyzedDataEntry = await analyzePage(rawDataEntry);
            analyzedDataArr.push({currentData: analyzedDataEntry});
        }

        // save analyzed data in DB
        const analyzedResult = await jobData.insertMany(analyzedDataArr);
        console.log(`${analyzedResult.insertedCount} documents were inserted`);

        console.log('workflow completed!');
    } catch (e) {
        console.log(`error ${e}`);
    } finally {
        await mongoClient.close();
    }
})

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
}) 