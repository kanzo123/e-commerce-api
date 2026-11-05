import express from 'express'
import authRouter from './routes/auth.js'
import notFoundMiddleware from "./middleware/not-found.js";
import errorHandlerMiddleware from "./middleware/error-handler.js";

const app = express();

app.use(express.json());
// Express 5 leaves req.body undefined when a request has no body
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

app.get('/', (req, res) => {
  res.json({ msg: 'E-Commerce API' });
});

app.use('/api/v1/auth', authRouter)

app.use(notFoundMiddleware)
app.use(errorHandlerMiddleware)

export default app;