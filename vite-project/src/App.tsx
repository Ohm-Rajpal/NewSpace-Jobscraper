import './App.css';
import { Button, TextField, createTheme, ThemeProvider } from '@mui/material';
import { useState } from "react";
import axios from 'axios';

const theme = createTheme({
  palette: {
    primary: {
      main: '#B3E0FF', 
    },
    secondary: {
      main: '#FFB6C1',
    },
  },
});

function App() {

  // code to handle the input
  const [message, setMessage] = useState(''); 

  const handleSubmit = async () => {
    try {
      console.log(`user message: ${message}`);
      const response = await axios.post('http://localhost:3000/ai_response', {message});
      const ai_response_parsed = response.data.data.content;
      
      console.log(`AI response: ${ai_response_parsed}`);
    } catch (error) {
      console.log('failed to fetch AI');
      console.log(error);
    }
  };

  // testing if playwright get request works
  // const testPlaywright = async () => {
  //   try {
  //     console.log('about to test playwright');
  //     const scrapedResponse = await axios.get('http://localhost:3000/scrape_test');
  //     console.log(`Backend response ${scrapedResponse}`);
  //   } catch (e) {
  //     console.log('Failed to make get request');
  //     console.log(`error was ${e}`);
  //   }
  // }

  const testScrapingBee = async () => {
    try {
      console.log('testing scraping bee bc playwright is hard');
      const exampleCall = await axios.get('http://localhost:3000/webscrape_jobs');
      console.log(`Backend response ${exampleCall}`);
    } catch (e) {
      console.log('failed to make get request');
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '20px',
        }}
      >
        <TextField
          value={message}
          onChange={(e) => setMessage(e.target.value)} 
          autoComplete="off"
          id="outlined-basic"
          label="Input text"
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: theme.palette.primary.main,
              },
              '&:hover fieldset': {
                borderColor: theme.palette.secondary.main, 
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.secondary.main, 
              },
              '& input': {
                color: '#FFB6C1', 
              },
            },
            '& .MuiInputLabel-root': {
              color: theme.palette.primary.main, 
            },
            '&:hover .MuiInputLabel-root': {
              color: theme.palette.secondary.main, 
            },
            '& .Mui-focused': {
              color: theme.palette.secondary.main,
            },
          }}
        />
        <Button
          variant="outlined"
          sx={{
            borderColor: theme.palette.primary.main,
            color: theme.palette.primary.main, 
            '&:hover': {
              borderColor: theme.palette.secondary.main, 
              backgroundColor: theme.palette.secondary.main, 
              color: '#fff', 
            },
          }}
          onClick={() => handleSubmit()}
        >
          Submit
        </Button>

        {/* temporary button to test playwright */}
        <Button
          variant="outlined"
          sx={{
            borderColor: theme.palette.primary.main,
            color: theme.palette.primary.main, 
            '&:hover': {
              borderColor: theme.palette.secondary.main, 
              backgroundColor: theme.palette.secondary.main, 
              color: '#fff', 
            },
          }}
          // onClick={() => testPlaywright()}
          onClick={() => testScrapingBee()}
        >
          Test Playwright
        </Button>

      </div>
    </ThemeProvider>
  );
}

export default App;
