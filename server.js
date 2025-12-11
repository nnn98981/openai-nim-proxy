// server.js - OpenAI to iFlow Proxy
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// iFlow API configuration
const IFLOW_API_BASE = process.env.IFLOW_API_BASE || 'https://apis.iflow.cn/v1';
const IFLOW_API_KEY = process.env.IFLOW_API_KEY;

// Model mapping
const MODEL_MAPPING = {
  'gpt-3.5-turbo': 'qwen3-max',
  'gpt-4': 'glm-4.6',
  'gpt-4-turbo': 'Kimi-K2',
  'gpt-4o': 'deepseek-v3.2',
  'claude-3-opus': 'deepseek-v3',
  'claude-3-sonnet': 'tstars2.0'
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'OpenAI to iFlow Proxy' });
});

// List models
app.get('/v1/models', (req, res) => {
  const models = Object.keys(MODEL_MAPPING).map(model => ({
    id: model,
    object: 'model',
    created: Date.now(),
    owned_by: 'iflow-proxy'
  }));
  res.json({ object: 'list', data: models });
});

// Chat completions endpoint
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { model, messages, temperature, max_tokens, stream } = req.body;
    
    // Get iFlow model
    const iflowModel = MODEL_MAPPING[model] || 'TBStars2-200B-A13B';
    
    // iFlow uses same format as OpenAI - just forward the request!
    const iflowRequest = {
      model: iflowModel,
      messages: messages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 2000,
      stream: stream || false
    };
    
    const response = await axios.post(`${IFLOW_API_BASE}/chat/completions`, iflowRequest, {
      headers: {
        'Authorization': `Bearer ${IFLOW_API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: stream ? 'stream' : 'json'
    });
    
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      response.data.pipe(res);
    } else {
      // Forward response directly (same format!)
      res.json(response.data);
    }
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'invalid_request_error',
        code: error.response?.status || 500
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`iFlow Proxy running on port ${PORT}`);
});
