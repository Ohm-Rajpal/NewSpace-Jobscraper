import './App.css';
import { Button, TextField, createTheme, ThemeProvider } from '@mui/material';
import { useState } from "react";
import axios from 'axios';

const theme = createTheme({
  palette: {
    primary: {
      main: '#ADD8E6', // Light blue
    },
    secondary: {
      main: '#FFB6C1', // Light pink
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

  // works for GET requests
  // const handleSubmit = async () => {

  //   try {
  //     console.log(`user message: ${message}`);
  //     const response = await axios.get('http://localhost:3000/');
  //     console.log(response.data.data.content);
  //   } catch (error) {
  //     console.log('failed to fetch AI');
  //     console.log(error);
  //   }
  // };


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
                borderColor: 'purple', // Default border color
              },
              '&:hover fieldset': {
                borderColor: '#FFC0CB', // Pink border on hover
              },
              '&.Mui-focused fieldset': {
                borderColor: '#FFC0CB', // Pink border on focus
              },
            },
            '& .MuiInputLabel-root': {
              color: 'purple', // Label default color
            },
            '&:hover .MuiInputLabel-root': {
              color: '#FFC0CB', // Label color on hover
            },
            '& .Mui-focused': {
              color: '#FFC0CB', // Label color on focus
            },
          }}
        />
        <Button
          variant="outlined"
          sx={{
            borderColor: 'purple',
            color: 'purple',
            '&:hover': {
              borderColor: '#FFC0CB',
              backgroundColor: '#FFC0CB',
              color: '#fff',
            },
          }}
          onClick={() => handleSubmit()}
        >
          Submit
        </Button>
      </div>
    </ThemeProvider>
  );
}

export default App;
