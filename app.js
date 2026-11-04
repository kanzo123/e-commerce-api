import express from 'express'
import notFoundMiddleware from "./middleware/not-found.js";
import errorHandlerMiddleware from "./middleware/error-handler.js";

const app = express();

app.get('/', (req, res) => {
  res.json({ msg: 'E-Commerce API' });
});

app.use(notFoundMiddleware)
app.use(errorHandlerMiddleware)

export default app;