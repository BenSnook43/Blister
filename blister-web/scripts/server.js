const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const port = 3001;

// Configure CORS to allow requests from all development ports
app.use(cors({
  origin: ['http://localhost:5177', 'http://localhost:5174', 'http://localhost:5182'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

app.get('/scrape-events', async (req, res) => {
  console.log('Received request for /scrape-events');
  
  const serverDir = __dirname;
  console.log('Server directory:', serverDir);
  
  // Use the virtual environment's Python
  const pythonPath = path.join(process.cwd(), 'venv/bin/python3');
  console.log('Using Python at:', pythonPath);
  
  const scriptPath = path.join(serverDir, 'scrape_events.py');
  console.log('Running script at:', scriptPath);
  
  let dataBuffer = '';
  let errorBuffer = '';
  
  const pythonProcess = spawn(pythonPath, [scriptPath]);

  // Collect stdout data
  pythonProcess.stdout.on('data', (data) => {
    console.log('Python output received');
    dataBuffer += data.toString();
  });

  // Collect stderr data (for logging)
  pythonProcess.stderr.on('data', (data) => {
    console.error('Python log:', data.toString());
    errorBuffer += data.toString();
  });

  // Handle process completion
  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code: ${code}`);
    console.log('Final stdout buffer length:', dataBuffer.length);
    
    try {
      // Try to parse the complete buffer as JSON
      const events = JSON.parse(dataBuffer);
      console.log(`Successfully parsed ${events.length} events`);
      res.json(events);
    } catch (error) {
      console.error('Error parsing Python output:', error);
      console.log('Raw stdout:', dataBuffer);
      console.log('Error logs:', errorBuffer);
      res.status(500).json({ 
        error: 'Failed to parse events',
        details: error.message,
        stdout: dataBuffer,
        stderr: errorBuffer
      });
    }
  });

  // Handle process errors
  pythonProcess.on('error', (error) => {
    console.error('Failed to start Python process:', error);
    res.status(500).json({ 
      error: 'Failed to start scraping process',
      details: error.message 
    });
  });
});

// Add a test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Scraper server is running' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Server directory: ${__dirname}`);
}); 