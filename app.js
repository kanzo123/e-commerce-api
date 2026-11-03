import express from 'express'

const app = express();

app.get('/', (req, res) => {
  res.json({ msg: 'E-Commerce API' });
});

export default app;